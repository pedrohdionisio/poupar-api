import { importPurchaseBodySchema } from '@application/controllers/purchases/schemas/importPurchaseSchema';
import { Purchase } from '@application/entities/Purchase';
import { Receipt } from '@application/entities/Receipt';
import { ACCESS_KEY, ARROZ_GTIN, MERCHANT_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

function makeBody(overrides: Record<string, unknown> = {}) {
	return {
		source: Purchase.Source.MANUAL,
		purchasedAt: '2026-02-19T17:30:00.000Z',
		merchantId: MERCHANT_ID,
		totalCents: 2500,
		items: [makeItem()],
		...overrides
	};
}

function makeItem(overrides: Record<string, unknown> = {}) {
	return {
		seq: 1,
		description: 'ARROZ TIO JOAO 5KG',
		quantityMilli: 1000,
		unit: Receipt.Unit.UN,
		unitPriceCents: 2500,
		totalCents: 2500,
		...overrides
	};
}

describe('importPurchaseBodySchema defaults', () => {
	it('should default every optional field to null or zero', () => {
		const body = importPurchaseBodySchema.parse(makeBody());

		expect(body).toMatchObject({
			accessKey: null,
			photoS3Key: null,
			ocrS3Key: null,
			discountCents: 0
		});
		expect(body.items[0]).toMatchObject({
			displayName: null,
			merchantCode: null,
			gtin: null,
			category: Receipt.ProductCategory.OTHER,
			discountCents: 0
		});
	});

	it('should accept a full payload', () => {
		const body = importPurchaseBodySchema.parse(
			makeBody({
				accessKey: ACCESS_KEY,
				photoS3Key: 'scans/photo.jpg',
				ocrS3Key: 'ocr/scan.json',
				discountCents: 500,
				items: [
					makeItem({
						displayName: 'Arroz Tio João 5kg',
						gtin: ARROZ_GTIN,
						merchantCode: 'A12',
						category: Receipt.ProductCategory.GRAINS
					})
				]
			})
		);

		expect(body.accessKey).toBe(ACCESS_KEY);
		expect(body.items[0].gtin).toBe(ARROZ_GTIN);
	});
});

describe('importPurchaseBodySchema money and quantity', () => {
	it('should refuse a fractional amount', () => {
		expect(
			importPurchaseBodySchema.safeParse(makeBody({ totalCents: 25.5 })).success
		).toBe(false);
	});

	it('should refuse a negative amount', () => {
		expect(
			importPurchaseBodySchema.safeParse(makeBody({ totalCents: -1 })).success
		).toBe(false);
	});

	it('should accept a zero amount', () => {
		expect(
			importPurchaseBodySchema.safeParse(makeBody({ totalCents: 0 })).success
		).toBe(true);
	});

	it('should refuse an item with no quantity', () => {
		expect(
			importPurchaseBodySchema.safeParse(
				makeBody({ items: [makeItem({ quantityMilli: 0 })] })
			).success
		).toBe(false);
	});
});

describe('importPurchaseBodySchema identifiers', () => {
	it('should refuse a merchant id that is not a ULID', () => {
		expect(
			importPurchaseBodySchema.safeParse(makeBody({ merchantId: 'abc' }))
				.success
		).toBe(false);
	});

	it('should refuse an access key that is not 44 characters', () => {
		expect(
			importPurchaseBodySchema.safeParse(
				makeBody({ accessKey: '3'.repeat(43) })
			).success
		).toBe(false);
	});

	it('should refuse a GTIN with an unsupported length', () => {
		expect(
			importPurchaseBodySchema.safeParse(
				makeBody({ items: [makeItem({ gtin: '7891000317' })] })
			).success
		).toBe(false);
	});

	it('should accept every supported GTIN length', () => {
		for (const gtin of [
			'12345670',
			'123456789012',
			ARROZ_GTIN,
			'12345678901231'
		]) {
			expect(
				importPurchaseBodySchema.safeParse(
					makeBody({ items: [makeItem({ gtin })] })
				).success
			).toBe(true);
		}
	});
});

describe('importPurchaseBodySchema shape', () => {
	it('should refuse a purchase with no item', () => {
		const result = importPurchaseBodySchema.safeParse(makeBody({ items: [] }));

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe(
			'"items" must have at least one item'
		);
	});

	it('should refuse a date that is not ISO', () => {
		expect(
			importPurchaseBodySchema.safeParse(
				makeBody({ purchasedAt: '19/02/2026' })
			).success
		).toBe(false);
	});

	it('should refuse an unknown source', () => {
		expect(
			importPurchaseBodySchema.safeParse(makeBody({ source: 'IMPORTED' }))
				.success
		).toBe(false);
	});
});
