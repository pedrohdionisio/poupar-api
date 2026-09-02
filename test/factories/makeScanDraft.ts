import { Receipt } from '@application/entities/Receipt';
import { Scan } from '@application/entities/Scan';
import { ACCESS_KEY, ARROZ_GTIN } from '@test/fixtures';

export function makeScanDraftItem(
	overrides: Partial<Scan.DraftItem> = {}
): Scan.DraftItem {
	return {
		seq: 1,
		description: 'ARR TIO JOAO 5KG TP1',
		displayName: 'Arroz Tio João 5kg',
		category: Receipt.ProductCategory.GRAINS,
		merchantCode: 'A12',
		gtin: ARROZ_GTIN,
		quantityMilli: 1000,
		unit: Receipt.Unit.UN,
		unitPriceCents: 2500,
		totalCents: 2500,
		discountCents: 0,
		...overrides
	};
}

export function makeScanDraft(overrides: Partial<Scan.Draft> = {}): Scan.Draft {
	return {
		purchasedAt: '2026-02-19T17:30:00.000Z',
		accessKey: ACCESS_KEY,
		totalCents: 12345,
		discountCents: 500,
		items: [makeScanDraftItem()],
		...overrides
	};
}
