import { Receipt } from '@application/entities/Receipt';
import type { ReceiptExtractionGateway } from '@infra/gateways/ReceiptExtractionGateway';
import { ACCESS_KEY } from '@test/fixtures';

type Extraction = ReceiptExtractionGateway.Extraction;

export function makeExtractionItem(
	overrides: Partial<Extraction['items'][number]> = {}
): Extraction['items'][number] {
	return {
		seq: 1,
		description: 'ARROZ TIO JOAO 5KG',
		normalizedName: 'Arroz Tio João 5kg',
		category: Receipt.ProductCategory.GRAINS,
		gtin: '',
		merchantCode: '',
		quantity: '1',
		unit: 'UN',
		unitPrice: '25,00',
		total: '25,00',
		discount: '',
		...overrides
	};
}

export function makeExtraction(
	overrides: Partial<Extraction> = {}
): Extraction {
	return {
		readable: true,
		issuedAt: '19/02/2026 14:30:00',
		accessKey: ACCESS_KEY,
		total: '25,00',
		discount: '',
		items: [makeExtractionItem()],
		...overrides
	};
}
