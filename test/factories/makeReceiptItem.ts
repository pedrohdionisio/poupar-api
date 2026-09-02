import { Receipt } from '@application/entities/Receipt';
import { ARROZ_GTIN, ARROZ_PRODUCT_KEY } from '@test/fixtures';

export function makeReceiptItem(
	overrides: Partial<Receipt.Item> = {}
): Receipt.Item {
	return {
		seq: 1,
		productKey: ARROZ_PRODUCT_KEY,
		description: 'ARR TIO JOAO 5KG TP1',
		displayName: 'Arroz Tio João 5kg',
		normalizedName: 'ARROZ TIO JOAO 5KG',
		category: Receipt.ProductCategory.GRAINS,
		gtin: ARROZ_GTIN,
		merchantCode: 'A12',
		quantityMilli: 1000,
		unit: Receipt.Unit.UN,
		unitPriceCents: 2500,
		totalCents: 2500,
		discountCents: 0,
		...overrides
	};
}
