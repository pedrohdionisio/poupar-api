import { ImportPurchaseNormalizer } from '@application/normalizers/ImportPurchaseNormalizer';
import { makePayloadItem } from '@test/factories/makePayloadItem';
import { describe, expect, it } from 'vitest';

describe('ImportPurchaseNormalizer.normalizeName', () => {
	it('should strip accents, collapse spaces and uppercase', () => {
		const normalized = ImportPurchaseNormalizer.normalizeName({
			description: '  Café   Torrado  Ação '
		});

		expect(normalized).toBe('CAFE TORRADO ACAO');
	});

	it('should leave an already normalized name untouched', () => {
		const normalized = ImportPurchaseNormalizer.normalizeName({
			description: 'ARROZ TIO JOAO 5KG'
		});

		expect(normalized).toBe('ARROZ TIO JOAO 5KG');
	});
});

describe('ImportPurchaseNormalizer.resolveProductKey', () => {
	it('should be the raw sha1 of the normalized name', () => {
		expect(
			ImportPurchaseNormalizer.resolveProductKey({
				normalizedName: 'ARROZ TIO JOAO 5KG'
			})
		).toBe('45de1fd2848f7dd1f2eacf76b898a942ca42fb0f');

		expect(
			ImportPurchaseNormalizer.resolveProductKey({
				normalizedName: 'LEITE INTEGRAL 1L'
			})
		).toBe('666921f1324c10aa69b4e1b0092fac30184b7986');
	});

	it('should have no prefix and stay URL safe', () => {
		const productKey = ImportPurchaseNormalizer.resolveProductKey({
			normalizedName: 'CAFE 500G'
		});

		expect(productKey).toMatch(/^[a-f0-9]{40}$/);
		expect(encodeURIComponent(productKey)).toBe(productKey);
	});
});

describe('ImportPurchaseNormalizer.resolveGtin', () => {
	it('should accept every GTIN length with a valid check digit', () => {
		expect(ImportPurchaseNormalizer.resolveGtin({ gtin: '12345670' })).toBe(
			'12345670'
		);
		expect(ImportPurchaseNormalizer.resolveGtin({ gtin: '123456789012' })).toBe(
			'123456789012'
		);
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '7891000317211' })
		).toBe('7891000317211');
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '12345678901231' })
		).toBe('12345678901231');
	});

	it('should reject a GTIN with a wrong check digit', () => {
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '7891000317212' })
		).toBeNull();
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '12345671' })
		).toBeNull();
	});

	it('should reject lengths outside 8, 12, 13 and 14', () => {
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '7891000317' })
		).toBeNull();
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '1234567' })
		).toBeNull();
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '123456789012345' })
		).toBeNull();
	});

	it('should reject empty and non numeric values', () => {
		expect(ImportPurchaseNormalizer.resolveGtin({ gtin: null })).toBeNull();
		expect(ImportPurchaseNormalizer.resolveGtin({ gtin: '' })).toBeNull();
		expect(
			ImportPurchaseNormalizer.resolveGtin({ gtin: '789-1000-317211' })
		).toBeNull();
	});
});

describe('ImportPurchaseNormalizer.normalize', () => {
	it('should keep distinct products apart and count them', () => {
		const { items, itemCount } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ seq: 1, description: 'ARROZ TIO JOAO 5KG' }),
				makePayloadItem({ seq: 2, description: 'LEITE INTEGRAL 1L' })
			]
		});

		expect(itemCount).toBe(2);
		expect(items.map((item) => item.productKey)).toEqual([
			'45de1fd2848f7dd1f2eacf76b898a942ca42fb0f',
			'666921f1324c10aa69b4e1b0092fac30184b7986'
		]);
	});

	it('should consolidate repeated lines of the same product', () => {
		const { items, itemCount } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({
					seq: 3,
					quantityMilli: 1000,
					unitPriceCents: 2500,
					totalCents: 2500,
					discountCents: 0
				}),
				makePayloadItem({
					seq: 1,
					quantityMilli: 2000,
					unitPriceCents: 2400,
					totalCents: 4800,
					discountCents: 100
				})
			]
		});

		expect(itemCount).toBe(1);
		expect(items[0]).toMatchObject({
			seq: 1,
			quantityMilli: 3000,
			totalCents: 7300,
			discountCents: 100,
			unitPriceCents: 2433
		});
	});

	it('should fall back to the total when the consolidated quantity is zero', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ quantityMilli: 0, totalCents: 100 }),
				makePayloadItem({ quantityMilli: 0, totalCents: 200 })
			]
		});

		expect(items[0].unitPriceCents).toBe(300);
	});

	it('should sort the consolidated items by their smallest sequence', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ seq: 5, description: 'LEITE INTEGRAL 1L' }),
				makePayloadItem({ seq: 4, description: 'ARROZ TIO JOAO 5KG' }),
				makePayloadItem({ seq: 1, description: 'ARROZ TIO JOAO 5KG' })
			]
		});

		expect(items.map((item) => item.seq)).toEqual([1, 5]);
	});

	it('should use the display name to build the key and keep the raw description', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({
					description: 'ARR TIO JOAO 5KG TP1',
					displayName: 'Arroz Tio João 5kg'
				})
			]
		});

		expect(items[0]).toMatchObject({
			description: 'ARR TIO JOAO 5KG TP1',
			displayName: 'Arroz Tio João 5kg',
			normalizedName: 'ARROZ TIO JOAO 5KG',
			productKey: '45de1fd2848f7dd1f2eacf76b898a942ca42fb0f'
		});
	});

	it('should fall back to the description when the display name is blank', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({
					description: 'ARROZ TIO JOAO 5KG',
					displayName: '   '
				})
			]
		});

		expect(items[0].displayName).toBe('ARROZ TIO JOAO 5KG');
		expect(items[0].productKey).toBe(
			'45de1fd2848f7dd1f2eacf76b898a942ca42fb0f'
		);
	});

	it('should adopt the GTIN of a later line when the first one is missing', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ seq: 1, gtin: '7891000317212' }),
				makePayloadItem({ seq: 2, gtin: '7891000317211' })
			]
		});

		expect(items).toHaveLength(1);
		expect(items[0].gtin).toBe('7891000317211');
	});

	it('should keep the GTIN of the first line when it is already valid', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ seq: 1, gtin: '7891000317211' }),
				makePayloadItem({ seq: 2, gtin: '7898586040076' })
			]
		});

		expect(items[0].gtin).toBe('7891000317211');
	});

	it('should adopt the merchant code of a later line when the first one is blank', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ seq: 1, merchantCode: '   ' }),
				makePayloadItem({ seq: 2, merchantCode: ' A12 ' })
			]
		});

		expect(items[0].merchantCode).toBe('A12');
	});

	it('should drop an invalid GTIN and trim the merchant code', () => {
		const { items } = ImportPurchaseNormalizer.normalize({
			items: [
				makePayloadItem({ gtin: '7891000317212', merchantCode: '  A12  ' }),
				makePayloadItem({
					description: 'LEITE INTEGRAL 1L',
					gtin: '7891000317211',
					merchantCode: '   '
				})
			]
		});

		expect(items[0]).toMatchObject({ gtin: null, merchantCode: 'A12' });
		expect(items[1]).toMatchObject({
			gtin: '7891000317211',
			merchantCode: null
		});
	});
});
