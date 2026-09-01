import { readFileSync } from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
	BatchWriteCommand,
	DynamoDBDocumentClient
} from '@aws-sdk/lib-dynamodb';

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 8;

async function main(): Promise<void> {
	const TableName = process.env.MAIN_TABLE_NAME;
	const file = process.argv[2] ?? 'seed/mainTable.seed.json';

	if (!TableName) {
		console.error('Defina MAIN_TABLE_NAME com o nome da tabela.');
		process.exit(1);
	}

	const client = DynamoDBDocumentClient.from(
		new DynamoDBClient({ region: process.env.AWS_REGION ?? 'sa-east-1' })
	);

	const items: Record<string, unknown>[] = JSON.parse(
		readFileSync(file, 'utf-8')
	);

	let written = 0;

	for (let index = 0; index < items.length; index += BATCH_SIZE) {
		let requests = items
			.slice(index, index + BATCH_SIZE)
			.map((Item) => ({ PutRequest: { Item } }));
		let attempt = 0;

		while (requests.length > 0) {
			const { UnprocessedItems } = await client.send(
				new BatchWriteCommand({ RequestItems: { [TableName]: requests } })
			);

			const pending = (UnprocessedItems?.[TableName] ?? []) as typeof requests;

			written += requests.length - pending.length;
			requests = pending;

			if (requests.length === 0) {
				break;
			}

			attempt += 1;

			if (attempt >= MAX_ATTEMPTS) {
				console.error(`Desisti com ${requests.length} itens não processados.`);
				process.exit(1);
			}

			await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 50));
		}

		console.error(`${written}/${items.length}`);
	}

	console.error(`Pronto: ${written} itens gravados em ${TableName}.`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
