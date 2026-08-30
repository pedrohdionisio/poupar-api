import { ReceiptExtractionFailed } from '@application/errors/application/ReceiptExtractionFailed';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import z from 'zod';

const PROMPT = `Você recebe a foto de um cupom fiscal brasileiro (NFC-e, NFe ou SAT).

Transcreva EXATAMENTE o que está impresso. Não calcule, não arredonde e não corrija nada:
copie os valores como aparecem no papel.

Regras:
- Valores monetários como impressos, com vírgula decimal ("3,99"). Nunca converta para centavos.
- Quantidade como impressa ("1", "0,384").
- unit: use UN, KG ou L. Mapeie UNID/PC/UND para UN e LT para L.
- gtin: o código de barras impresso na linha do item, apenas dígitos.
- merchantCode: o código interno do item, quando houver e for diferente do código de barras.
- cnpj: apenas os 14 dígitos, sem pontuação.
- accessKey: a chave de acesso de 44 dígitos, sem espaços.
- issuedAt: a data e a hora de emissão exatamente como impressas.
- discount: o desconto da linha, ou do cupom no total. Use "0" quando não houver.
- Campo que você não conseguir ler no papel: devolva string vazia.

Se a imagem não for um cupom fiscal, ou estiver ilegível a ponto de você não conseguir extrair
os itens, devolva readable = false.`;

const RESPONSE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		readable: {
			type: 'boolean',
			description: 'false quando a imagem não é um cupom fiscal legível'
		},
		merchant: {
			type: 'object',
			additionalProperties: false,
			properties: {
				cnpj: { type: 'string' },
				name: { type: 'string' },
				fantasyName: { type: 'string' },
				address: { type: 'string' }
			},
			required: ['cnpj', 'name', 'fantasyName', 'address']
		},
		issuedAt: { type: 'string', description: 'data e hora como impressas' },
		accessKey: { type: 'string' },
		total: { type: 'string' },
		discount: { type: 'string' },
		items: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					seq: { type: 'integer' },
					description: { type: 'string' },
					gtin: { type: 'string' },
					merchantCode: { type: 'string' },
					quantity: { type: 'string' },
					unit: { type: 'string', enum: ['UN', 'KG', 'L'] },
					unitPrice: { type: 'string' },
					total: { type: 'string' },
					discount: { type: 'string' }
				},
				required: [
					'seq',
					'description',
					'gtin',
					'merchantCode',
					'quantity',
					'unit',
					'unitPrice',
					'total',
					'discount'
				]
			}
		}
	},
	required: [
		'readable',
		'merchant',
		'issuedAt',
		'accessKey',
		'total',
		'discount',
		'items'
	]
};

const extractionSchema = z.object({
	readable: z.boolean(),
	merchant: z.object({
		cnpj: z.string(),
		name: z.string(),
		fantasyName: z.string(),
		address: z.string()
	}),
	issuedAt: z.string(),
	accessKey: z.string(),
	total: z.string(),
	discount: z.string(),
	items: z.array(
		z.object({
			seq: z.int(),
			description: z.string(),
			gtin: z.string(),
			merchantCode: z.string(),
			quantity: z.string(),
			unit: z.enum(['UN', 'KG', 'L']),
			unitPrice: z.string(),
			total: z.string(),
			discount: z.string()
		})
	)
});

@Injectable()
export class ReceiptExtractionGateway {
	private static readonly ENDPOINT = 'https://api.openai.com/v1/responses';

	private static readonly SCHEMA_NAME = 'receipt_extraction';

	private static readonly REASONING_EFFORT = 'low';

	private static readonly IMAGE_DETAIL = 'high';

	private static readonly BUDGET_IN_MS = 150_000;

	private static readonly REQUEST_TIMEOUT_IN_MS = 45_000;

	private static readonly MIN_RETRY_BUDGET_IN_MS = 30_000;

	private static readonly MAX_REQUESTS = 3;

	private static readonly RETRY_DELAY_IN_MS = 2_000;

	constructor(private readonly appConfig: AppConfig) {}

	async extract({
		image,
		mimeType
	}: ReceiptExtractionGateway.ExtractParams): Promise<ReceiptExtractionGateway.ExtractResult> {
		const deadline = Date.now() + ReceiptExtractionGateway.BUDGET_IN_MS;
		let requests = 0;

		while (true) {
			requests++;

			try {
				const rawJson = await this.request({
					image,
					mimeType,
					timeoutInMs: Math.min(
						ReceiptExtractionGateway.REQUEST_TIMEOUT_IN_MS,
						deadline - Date.now()
					)
				});

				return {
					rawJson,
					extraction: ReceiptExtractionGateway.parse({ rawJson })
				};
			} catch (error) {
				const remaining = deadline - Date.now();
				const retryable =
					error instanceof ReceiptExtractionFailed &&
					error.details?.retryable === true;

				if (
					!retryable ||
					requests >= ReceiptExtractionGateway.MAX_REQUESTS ||
					remaining < ReceiptExtractionGateway.MIN_RETRY_BUDGET_IN_MS
				) {
					throw error;
				}

				await new Promise((resolve) =>
					setTimeout(
						resolve,
						ReceiptExtractionGateway.RETRY_DELAY_IN_MS * requests
					)
				);
			}
		}
	}

	private async request({
		image,
		mimeType,
		timeoutInMs
	}: ReceiptExtractionGateway.RequestParams): Promise<string> {
		const response = await this.send({ image, mimeType, timeoutInMs });

		if (!response.ok) {
			throw new ReceiptExtractionFailed(
				`OpenAI responded ${response.status}: ${await response.text()}`,
				response.status === 429 || response.status >= 500
			);
		}

		return ReceiptExtractionGateway.getOutputText({
			payload: await response.json()
		});
	}

	private async send({
		image,
		mimeType,
		timeoutInMs
	}: ReceiptExtractionGateway.RequestParams): Promise<Response> {
		try {
			return await fetch(ReceiptExtractionGateway.ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.appConfig.ai.openai.apiKey}`
				},
				body: JSON.stringify({
					model: this.appConfig.ai.openai.model,
					reasoning: { effort: ReceiptExtractionGateway.REASONING_EFFORT },
					input: [
						{
							role: 'user',
							content: [
								{ type: 'input_text', text: PROMPT },
								{
									type: 'input_image',
									detail: ReceiptExtractionGateway.IMAGE_DETAIL,
									image_url: `data:${mimeType};base64,${image.toString('base64')}`
								}
							]
						}
					],
					text: {
						format: {
							type: 'json_schema',
							name: ReceiptExtractionGateway.SCHEMA_NAME,
							strict: true,
							schema: RESPONSE_SCHEMA
						}
					}
				}),
				signal: AbortSignal.timeout(Math.max(timeoutInMs, 1))
			});
		} catch (error) {
			throw new ReceiptExtractionFailed(
				`OpenAI request failed: ${(error as Error).message}`
			);
		}
	}

	private static getOutputText({
		payload
	}: ReceiptExtractionGateway.GetOutputTextParams): string {
		const content = (
			payload as ReceiptExtractionGateway.ResponsesPayload
		).output
			?.filter((item) => item.type === 'message')
			.flatMap((item) => item.content ?? []);

		const refusal = content?.find((part) => part.type === 'refusal')?.refusal;

		if (refusal) {
			throw new ReceiptExtractionFailed(
				`OpenAI refused the extraction: ${refusal}`,
				false
			);
		}

		const output = content?.find((part) => part.type === 'output_text')?.text;

		if (!output) {
			throw new ReceiptExtractionFailed('OpenAI response has no model output.');
		}

		return output;
	}

	private static parse({
		rawJson
	}: ReceiptExtractionGateway.ParseParams): ReceiptExtractionGateway.Extraction | null {
		const parsed = extractionSchema.safeParse(
			ReceiptExtractionGateway.toJson({ rawJson })
		);

		return parsed.success ? parsed.data : null;
	}

	private static toJson({
		rawJson
	}: ReceiptExtractionGateway.ParseParams): unknown {
		try {
			return JSON.parse(rawJson);
		} catch {
			return null;
		}
	}
}

export namespace ReceiptExtractionGateway {
	export type Extraction = z.infer<typeof extractionSchema>;

	export type ExtractParams = {
		image: Buffer;
		mimeType: string;
	};

	export type RequestParams = {
		image: Buffer;
		mimeType: string;
		timeoutInMs: number;
	};

	export type ExtractResult = {
		rawJson: string;
		extraction: Extraction | null;
	};

	export type GetOutputTextParams = {
		payload: unknown;
	};

	export type ParseParams = {
		rawJson: string;
	};

	export type ResponsesPayload = {
		output?: {
			type: string;
			content?: { type: string; text?: string; refusal?: string }[];
		}[];
	};
}
