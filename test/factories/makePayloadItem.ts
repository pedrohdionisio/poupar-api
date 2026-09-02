import { Receipt } from '@application/entities/Receipt';
import type { ImportPurchaseNormalizer } from '@application/normalizers/ImportPurchaseNormalizer';

export function makePayloadItem(
	overrides: Partial<ImportPurchaseNormalizer.PayloadItem> = {}
): ImportPurchaseNormalizer.PayloadItem {
	return {
		seq: 1,
		description: 'ARROZ TIO JOAO 5KG',
		displayName: null,
		category: Receipt.ProductCategory.GRAINS,
		merchantCode: null,
		gtin: null,
		quantityMilli: 1000,
		unit: Receipt.Unit.UN,
		unitPriceCents: 2500,
		totalCents: 2500,
		discountCents: 0,
		...overrides
	};
}
