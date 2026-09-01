import { Receipt } from '@application/entities/Receipt';
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
- accessKey: a chave de acesso de 44 dígitos, sem espaços.
- issuedAt: a data e a hora de emissão exatamente como impressas.
- discount: o desconto da linha, ou do cupom no total. Use "0" quando não houver.
- Campo que você não conseguir ler no papel: devolva string vazia.

O estabelecimento já é conhecido — não extraia CNPJ, razão social nem endereço.

## normalizedName

Além da transcrição literal em "description", devolva em "normalizedName" o nome comercial do
produto, legível para uma pessoa. Este campo é o que identifica o produto ao longo do tempo, então
precisa sair IGUAL para o mesmo produto em notas diferentes.

- Title Case, acentuação correta.
- Expanda abreviações: DET → Detergente, REFRIG → Refrigerante, ACHOC → Achocolatado,
  BISC → Biscoito, MARG → Margarina, INT → Integral, DESN → Desnatado.
- Formato: "<Produto> <Marca> <Variante> <Tamanho>". Omita a parte que não estiver impressa.
- MANTENHA o tamanho/volume quando impresso ("500ml", "1L", "5kg") — tamanhos diferentes são
  produtos diferentes. NÃO inclua peso variável de item vendido a granel por KG.
- Não inclua código interno, código de barras, sigla de tributação nem sufixo de embalagem solto.

Exemplos:
- "BANAN NANIC KG" → "Banana Nanica"
- "DET LOUCA YPE 500ML" → "Detergente Ypê 500ml"
- "LEITE ITALAC INT 1L" → "Leite Italac Integral 1L"
- "REFRIG COCA COLA 2L" → "Refrigerante Coca-Cola 2L"
- "ACHOC PO NESCAU 380G" → "Achocolatado em Pó Nescau 380g"
- "PAO FRANCES KG" → "Pão Francês"

## category

Classifique cada item em UMA das categorias abaixo. Use o significado do produto, não a seção da
loja onde ele foi impresso no cupom.

- PRODUCE — frutas, verduras, legumes, ovos in natura a granel
- MEAT — carne bovina, suína, aves, linguiça fresca
- SEAFOOD — peixes, camarão, frutos do mar
- DELI — frios e embutidos fatiados: presunto, mortadela, salame, bacon, salsicha
- DAIRY — leite, queijo, iogurte, manteiga, requeijão, creme de leite fresco, ovos em cartela
- BAKERY — pães, bolos, tortas, biscoito de padaria, produtos da confeitaria
- GRAINS — arroz, feijão, macarrão, farinha, açúcar, aveia, grãos secos
- CANNED — enlatados e conservas: milho, ervilha, atum, sardinha, extrato de tomate
- CONDIMENTS — óleo, azeite, vinagre, sal, temperos, molhos, maionese, ketchup
- BREAKFAST — café, chá, achocolatado em pó, cereal matinal, geleia, leite condensado
- SNACKS — chocolate, bala, biscoito industrializado, salgadinho, sorvete
- FROZEN — congelados: nuggets, pizza, hambúrguer, legumes congelados, polpa
- PREPARED_FOODS — rotisseria e pratos prontos vendidos quentes ou refrigerados
- BEVERAGES — bebidas sem álcool: refrigerante, suco, água, energético, isotônico
- ALCOHOL — cerveja, vinho, destilados, qualquer bebida alcoólica
- CLEANING — detergente, sabão, desinfetante, amaciante, água sanitária, esponja
- DISPOSABLES — papel higiênico, papel toalha, guardanapo, saco de lixo, papel alumínio
- PERSONAL_CARE — shampoo, sabonete, creme dental, desodorante, absorvente, cosmético
- PHARMACY — medicamentos, vitaminas, curativos, preservativos
- BABY — fralda, lenço umedecido, papinha, fórmula infantil
- PET — ração, areia sanitária, petisco e acessório para animais
- HOUSEHOLD — bazar e utilidades: panela, lâmpada, pilha, ferramenta, utensílio
- TOBACCO — cigarro, tabaco, isqueiro
- OTHER — nada acima se aplica, ou o item não é identificável

Desempates (siga à risca):
- Leite condensado, creme de leite em caixinha e leite em pó vão para BREAKFAST, não DAIRY.
- Sorvete e açaí vão para SNACKS, não FROZEN.
- Pão de forma, bisnaguinha e torrada industrializados vão para BAKERY.
- Biscoito doce ou salgado de pacote vai para SNACKS, não BAKERY.
- Papel higiênico e guardanapo vão para DISPOSABLES, nunca CLEANING nem PERSONAL_CARE.
- Sabão em pó vai para CLEANING; sabonete vai para PERSONAL_CARE.
- Fralda vai para BABY mesmo sendo item de higiene.
- Ração vai para PET mesmo sendo alimento.
- Bebida alcoólica vai para ALCOHOL mesmo sendo cerveja sem álcool aparente no nome.
- Sacola plástica, taxa e serviço vão para OTHER.

Se a imagem não for um cupom fiscal, ou estiver ilegível a ponto de você não conseguir extrair
os itens, devolva readable = false.`;

const KNOWN_PRODUCTS_PROMPT = `## Produtos já cadastrados nesta conta

Se um item do cupom for o MESMO produto de um destes nomes, devolva em "normalizedName" o nome da
lista, copiado exatamente, caractere por caractere. Só invente um nome novo quando o produto
realmente não estiver na lista.`;

const RESPONSE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	properties: {
		readable: {
			type: 'boolean',
			description: 'false quando a imagem não é um cupom fiscal legível'
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
					normalizedName: {
						type: 'string',
						description: 'nome comercial padronizado do produto'
					},
					category: {
						type: 'string',
						enum: Object.values(Receipt.ProductCategory),
						description: 'categoria do produto'
					},
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
					'normalizedName',
					'category',
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
	required: ['readable', 'issuedAt', 'accessKey', 'total', 'discount', 'items']
};

const extractionSchema = z.object({
	readable: z.boolean(),
	issuedAt: z.string(),
	accessKey: z.string(),
	total: z.string(),
	discount: z.string(),
	items: z.array(
		z.object({
			seq: z.int(),
			description: z.string(),
			normalizedName: z.string(),
			category: z.enum(Receipt.ProductCategory),
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

	private static readonly MAX_KNOWN_PRODUCTS = 400;

	constructor(private readonly appConfig: AppConfig) {}

	async extract({
		image,
		mimeType,
		knownProducts
	}: ReceiptExtractionGateway.ExtractParams): Promise<ReceiptExtractionGateway.ExtractResult> {
		const deadline = Date.now() + ReceiptExtractionGateway.BUDGET_IN_MS;
		const prompt = ReceiptExtractionGateway.buildPrompt({ knownProducts });
		let requests = 0;

		while (true) {
			requests++;

			try {
				const rawJson = await this.request({
					image,
					mimeType,
					prompt,
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

	private static buildPrompt({
		knownProducts
	}: ReceiptExtractionGateway.BuildPromptParams): string {
		if (!knownProducts.length) {
			return PROMPT;
		}

		const list = knownProducts
			.slice(0, ReceiptExtractionGateway.MAX_KNOWN_PRODUCTS)
			.map((name) => `- ${name}`)
			.join('\n');

		return `${PROMPT}\n\n${KNOWN_PRODUCTS_PROMPT}\n\n${list}`;
	}

	private async request({
		image,
		mimeType,
		prompt,
		timeoutInMs
	}: ReceiptExtractionGateway.RequestParams): Promise<string> {
		const response = await this.send({ image, mimeType, prompt, timeoutInMs });

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
		prompt,
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
								{ type: 'input_text', text: prompt },
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
		knownProducts: string[];
	};

	export type BuildPromptParams = {
		knownProducts: string[];
	};

	export type RequestParams = {
		image: Buffer;
		mimeType: string;
		prompt: string;
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
