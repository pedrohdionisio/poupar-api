#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CONTENT_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png'
};

const MAX_SIZE_IN_BYTES = 10 * 1024 * 1024;
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_IMAGE = join(ROOT_DIR, 'scripts/fixtures/sample-receipt.jpg');

const args = process.argv.slice(2);
const negative = args.includes('--negative');
const imagePath = args.find((arg) => !arg.startsWith('--')) ?? DEFAULT_IMAGE;

function log(step, message) {
	console.log(`${step}  ${message}`);
}

function fail(message, detail) {
	console.error(`\n✗ ${message}`);

	if (detail) {
		console.error(detail);
	}

	process.exit(1);
}

async function readDotEnv() {
	try {
		const content = await readFile(join(ROOT_DIR, '.env'), 'utf-8');

		return Object.fromEntries(
			content
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith('#'))
				.map((line) => {
					const index = line.indexOf('=');

					return [
						line.slice(0, index).trim(),
						line
							.slice(index + 1)
							.trim()
							.replace(/^["']|["']$/g, '')
					];
				})
		);
	} catch {
		return {};
	}
}

const config = { ...(await readDotEnv()), ...process.env };
const stage = config.STAGE ?? 'dev';

async function resolveApiUrl() {
	if (config.API_URL) {
		return { url: config.API_URL.replace(/\/$/, ''), source: 'API_URL' };
	}

	if (config.API_DOMAIN) {
		return { url: `https://${config.API_DOMAIN}`, source: '.env API_DOMAIN' };
	}

	try {
		const { stdout } = await execFileAsync(
			'npx',
			['serverless', 'info', '--stage', stage],
			{ cwd: ROOT_DIR, maxBuffer: 10 * 1024 * 1024 }
		);
		const match = stdout.match(
			/https:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/
		);

		if (match) {
			return { url: match[0], source: 'serverless info' };
		}
	} catch {}

	return fail(
		'Não consegui descobrir a URL da API.',
		'Rode com API_URL=https://... node scripts/test-scan-upload.mjs'
	);
}

async function api({ apiUrl, method, path, token, body }) {
	const response = await fetch(`${apiUrl}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {})
		},
		body: body ? JSON.stringify(body) : undefined
	});

	const text = await response.text();
	const parsed = text ? JSON.parse(text) : null;

	if (!response.ok) {
		fail(`${method} ${path} respondeu ${response.status}`, text);
	}

	return parsed;
}

async function getAccessToken(apiUrl) {
	if (config.ACCESS_TOKEN) {
		log('[1/4]', 'Usando ACCESS_TOKEN do ambiente.');

		return config.ACCESS_TOKEN;
	}

	const email = config.EMAIL;
	const password = config.PASSWORD;

	if (!email || !password) {
		return fail(
			'Faltam credenciais.',
			'Defina EMAIL e PASSWORD (ou ACCESS_TOKEN) no .env ou no ambiente.'
		);
	}

	const { accessToken } = await api({
		apiUrl,
		method: 'POST',
		path: '/auth/sign-in',
		body: { email, password }
	});

	log('[1/4]', `Autenticado como ${email}.`);

	return accessToken;
}

function buildForm({ fields, buffer, contentType, filename }) {
	const form = new FormData();

	for (const [key, value] of Object.entries(fields)) {
		form.append(key, value);
	}

	form.append('file', new Blob([buffer], { type: contentType }), filename);

	return form;
}

async function upload({ uploadSignature, buffer, contentType, filename }) {
	const response = await fetch(uploadSignature.url, {
		method: 'POST',
		body: buildForm({
			fields: uploadSignature.fields,
			buffer,
			contentType,
			filename
		})
	});

	return { status: response.status, body: await response.text() };
}

async function createScan({ apiUrl, accessToken, contentType }) {
	return api({
		apiUrl,
		method: 'POST',
		path: '/scans',
		token: accessToken,
		body: { contentType }
	});
}

async function runNegativeTests({ apiUrl, accessToken, buffer, contentType }) {
	console.log('\n--- testes negativos ---');

	const wrongType = await createScan({ apiUrl, accessToken, contentType });
	const wrongTypeResult = await upload({
		uploadSignature: {
			url: wrongType.uploadSignature.url,
			fields: {
				...wrongType.uploadSignature.fields,
				'Content-Type': 'image/gif'
			}
		},
		buffer,
		contentType: 'image/gif',
		filename: 'wrong-type.gif'
	});

	console.log(
		`Content-Type divergente  → ${wrongTypeResult.status} ${
			wrongTypeResult.status === 403 ? '✓ recusado' : '✗ deveria ser 403'
		}`
	);

	const oversize = await createScan({ apiUrl, accessToken, contentType });
	const oversizeResult = await upload({
		uploadSignature: oversize.uploadSignature,
		buffer: Buffer.alloc(MAX_SIZE_IN_BYTES + 1024),
		contentType,
		filename: 'oversize.jpg'
	});

	console.log(
		`Arquivo acima de 10MB    → ${oversizeResult.status} ${
			oversizeResult.status === 400 ? '✓ recusado' : '✗ deveria ser 400'
		}`
	);
	console.log(
		'\nOs dois scans criados aqui ficam PENDING e somem sozinhos pelo TTL.'
	);
}

async function main() {
	const contentType = CONTENT_TYPES[extname(imagePath).toLowerCase()];

	if (!contentType) {
		return fail(
			`Extensão não suportada: ${imagePath}`,
			'A API aceita apenas image/jpeg e image/png.'
		);
	}

	const buffer = await readFile(imagePath).catch(() =>
		fail(`Não encontrei a imagem: ${imagePath}`)
	);

	const { url: apiUrl, source } = await resolveApiUrl();

	console.log(`API: ${apiUrl}  (${source})`);
	console.log(
		`Imagem: ${imagePath} — ${buffer.length} bytes, ${contentType}\n`
	);

	const accessToken = await getAccessToken(apiUrl);

	const { scanId, uploadSignature } = await createScan({
		apiUrl,
		accessToken,
		contentType
	});

	log('[2/4]', `Scan criado: ${scanId}`);
	log('     ', `Key: ${uploadSignature.fields.key}`);

	const result = await upload({
		uploadSignature,
		buffer,
		contentType,
		filename: 'receipt.jpg'
	});

	if (result.status !== 204) {
		return fail(`Upload para o S3 respondeu ${result.status}`, result.body);
	}

	log('[3/4]', 'Upload aceito pelo S3 (204).');

	const scan = await api({
		apiUrl,
		method: 'GET',
		path: `/scans/${scanId}`,
		token: accessToken
	});

	log('[4/4]', `GET /scans/${scanId}:`);
	console.log(JSON.stringify(scan, null, 2));

	if (negative) {
		await runNegativeTests({ apiUrl, accessToken, buffer, contentType });
	}

	console.log(
		'\nO scan continua PENDING de propósito — nada consome o upload até o passo 3.'
	);
}

main();
