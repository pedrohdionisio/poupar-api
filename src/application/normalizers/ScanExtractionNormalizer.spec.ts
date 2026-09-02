import { Receipt } from '@application/entities/Receipt';
import { ReceiptNotParsed } from '@application/errors/application/ReceiptNotParsed';
import { ScanExtractionNormalizer } from '@application/normalizers/ScanExtractionNormalizer';
import type { ReceiptExtractionGateway } from '@infra/gateways/ReceiptExtractionGateway';
import {
	makeExtraction,
	makeExtractionItem
} from '@test/factories/makeExtraction';
import { ACCESS_KEY } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

function toDraft(
	extraction: ReceiptExtractionGateway.Extraction,
	vocabulary: {
		namesByGtin?: Map<string, string>;
		categoriesByName?: Map<string, Receipt.ProductCategory>;
	} = {}
) {
	return ScanExtractionNormalizer.toDraft({
		extraction,
		namesByGtin: vocabulary.namesByGtin ?? new Map(),
		categoriesByName: vocabulary.categoriesByName ?? new Map()
	});
}

describe('ScanExtractionNormalizer.toInt', () => {
	it('should read the comma as the decimal separator', () => {
		expect(ScanExtractionNormalizer.toInt({ value: '1,50', scale: 2 })).toBe(
			150
		);
		expect(
			ScanExtractionNormalizer.toInt({ value: 'R$ 1.234,56', scale: 2 })
		).toBe(123456);
		expect(
			ScanExtractionNormalizer.toInt({ value: '1.234.567,89', scale: 2 })
		).toBe(123456789);
	});

	it('should treat a dot followed by three digits as a thousands separator in cents', () => {
		expect(ScanExtractionNormalizer.toInt({ value: '1.234', scale: 2 })).toBe(
			123400
		);
		expect(
			ScanExtractionNormalizer.toInt({ value: '1.234.567', scale: 2 })
		).toBe(123456700);
	});

	it('should treat the same three digits as decimals when reading milli', () => {
		expect(ScanExtractionNormalizer.toInt({ value: '1.234', scale: 3 })).toBe(
			1234
		);
		expect(ScanExtractionNormalizer.toInt({ value: '0.5', scale: 3 })).toBe(
			500
		);
		expect(ScanExtractionNormalizer.toInt({ value: '0,384', scale: 3 })).toBe(
			384
		);
	});

	it('should scale a value without any separator', () => {
		expect(ScanExtractionNormalizer.toInt({ value: '12', scale: 2 })).toBe(
			1200
		);
		expect(ScanExtractionNormalizer.toInt({ value: '2', scale: 3 })).toBe(2000);
	});

	it('should round half up on the first discarded digit', () => {
		expect(ScanExtractionNormalizer.toInt({ value: '1,995', scale: 2 })).toBe(
			200
		);
		expect(ScanExtractionNormalizer.toInt({ value: '1,994', scale: 2 })).toBe(
			199
		);
		expect(ScanExtractionNormalizer.toInt({ value: '12,345', scale: 2 })).toBe(
			1235
		);
	});

	it('should throw when there is no digit and no fallback', () => {
		expect(() =>
			ScanExtractionNormalizer.toInt({ value: '', scale: 2 })
		).toThrow(ReceiptNotParsed);
		expect(() =>
			ScanExtractionNormalizer.toInt({ value: '-', scale: 2 })
		).toThrow(ReceiptNotParsed);
	});

	it('should return the fallback when there is no digit', () => {
		expect(
			ScanExtractionNormalizer.toInt({ value: '', scale: 2, fallback: 0 })
		).toBe(0);
	});

	it('should throw when the scaled value is not a safe integer', () => {
		expect(() =>
			ScanExtractionNormalizer.toInt({
				value: '99999999999999999,99',
				scale: 2
			})
		).toThrow(ReceiptNotParsed);
	});
});

describe('ScanExtractionNormalizer.toIsoDate', () => {
	it('should read a Brazilian date and shift it to UTC', () => {
		expect(
			ScanExtractionNormalizer.toIsoDate({ value: '19/02/2026 14:30:00' })
		).toBe('2026-02-19T17:30:00.000Z');
	});

	it('should read a Brazilian date without seconds', () => {
		expect(
			ScanExtractionNormalizer.toIsoDate({ value: '19/02/2026 14:30' })
		).toBe('2026-02-19T17:30:00.000Z');
	});

	it('should assume midnight when there is no time', () => {
		expect(ScanExtractionNormalizer.toIsoDate({ value: '19/02/2026' })).toBe(
			'2026-02-19T03:00:00.000Z'
		);
	});

	it('should expand a two digit year into the current century', () => {
		expect(ScanExtractionNormalizer.toIsoDate({ value: '19/02/26' })).toBe(
			'2026-02-19T03:00:00.000Z'
		);
	});

	it('should read an ISO date', () => {
		expect(
			ScanExtractionNormalizer.toIsoDate({ value: '2026-02-19T14:30:00' })
		).toBe('2026-02-19T17:30:00.000Z');
		expect(ScanExtractionNormalizer.toIsoDate({ value: '2026-02-19' })).toBe(
			'2026-02-19T03:00:00.000Z'
		);
	});

	it('should find the date inside a noisy line', () => {
		expect(
			ScanExtractionNormalizer.toIsoDate({
				value: 'Emissao: 19/02/2026 as 14:30:00'
			})
		).toBe('2026-02-19T17:30:00.000Z');
	});

	it('should throw when there is no recognizable date', () => {
		expect(() =>
			ScanExtractionNormalizer.toIsoDate({ value: 'sem data' })
		).toThrow(ReceiptNotParsed);
	});

	it('should throw when the day does not exist in the month', () => {
		expect(() =>
			ScanExtractionNormalizer.toIsoDate({ value: '31/02/2026' })
		).toThrow(ReceiptNotParsed);
		expect(() =>
			ScanExtractionNormalizer.toIsoDate({ value: '2026-02-31' })
		).toThrow(ReceiptNotParsed);
	});

	it('should throw when the month does not exist', () => {
		expect(() =>
			ScanExtractionNormalizer.toIsoDate({ value: '19/13/2026' })
		).toThrow(ReceiptNotParsed);
	});

	it('should throw when the time is out of range', () => {
		expect(() =>
			ScanExtractionNormalizer.toIsoDate({ value: '19/02/2026 25:00' })
		).toThrow(ReceiptNotParsed);
		expect(() =>
			ScanExtractionNormalizer.toIsoDate({ value: '19/02/2026 14:70' })
		).toThrow(ReceiptNotParsed);
	});

	it('should accept the last day of a leap February', () => {
		expect(ScanExtractionNormalizer.toIsoDate({ value: '29/02/2028' })).toBe(
			'2028-02-29T03:00:00.000Z'
		);
	});
});

describe('ScanExtractionNormalizer.toDraft', () => {
	it('should map the receipt header into the draft', () => {
		const draft = toDraft(
			makeExtraction({ total: '1.234,56', discount: '10,00' })
		);

		expect(draft).toMatchObject({
			purchasedAt: '2026-02-19T17:30:00.000Z',
			accessKey: ACCESS_KEY,
			totalCents: 123456,
			discountCents: 1000
		});
	});

	it('should keep an access key that only has separators around the digits', () => {
		const draft = toDraft(
			makeExtraction({ accessKey: `${'3'.repeat(4)} ${'3'.repeat(40)}` })
		);

		expect(draft.accessKey).toBe(ACCESS_KEY);
	});

	it('should drop an access key that is not 44 digits long', () => {
		expect(
			toDraft(makeExtraction({ accessKey: '3'.repeat(43) })).accessKey
		).toBeNull();
		expect(toDraft(makeExtraction({ accessKey: '' })).accessKey).toBeNull();
	});

	it('should default the discount to zero and require the total', () => {
		expect(toDraft(makeExtraction({ discount: '' })).discountCents).toBe(0);
		expect(() => toDraft(makeExtraction({ total: '' }))).toThrow(
			ReceiptNotParsed
		);
	});

	it('should map the item amounts into cents and milli', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({
						quantity: '0,384',
						unit: 'KG',
						unitPrice: '39,90',
						total: '15,32',
						discount: ''
					})
				]
			})
		);

		expect(draft.items[0]).toMatchObject({
			quantityMilli: 384,
			unit: Receipt.Unit.KG,
			unitPriceCents: 3990,
			totalCents: 1532,
			discountCents: 0
		});
	});

	it('should number the items by position when the extraction has no sequence', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({ seq: 0 }),
					makeExtractionItem({ seq: 0, description: 'LEITE INTEGRAL 1L' }),
					makeExtractionItem({ seq: 7, description: 'CAFE 500G' })
				]
			})
		);

		expect(draft.items.map((item) => item.seq)).toEqual([1, 2, 7]);
	});

	it('should rename the item to the known product of the same GTIN', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({
						gtin: '7891000317211',
						normalizedName: 'Arroz Tio Joao'
					})
				]
			}),
			{ namesByGtin: new Map([['7891000317211', 'Arroz Tio João 5kg']]) }
		);

		expect(draft.items[0]).toMatchObject({
			displayName: 'Arroz Tio João 5kg',
			gtin: '7891000317211'
		});
	});

	it('should ignore the vocabulary when the GTIN is invalid', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({
						gtin: '7891000317212',
						normalizedName: 'Arroz Tio Joao'
					})
				]
			}),
			{ namesByGtin: new Map([['7891000317212', 'Arroz Tio João 5kg']]) }
		);

		expect(draft.items[0]).toMatchObject({
			displayName: 'Arroz Tio Joao',
			gtin: null
		});
	});

	it('should let the known category of the account beat the extracted one', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({
						normalizedName: 'Arroz Tio João 5kg',
						category: Receipt.ProductCategory.OTHER
					})
				]
			}),
			{
				categoriesByName: new Map([
					['Arroz Tio João 5kg', Receipt.ProductCategory.GRAINS]
				])
			}
		);

		expect(draft.items[0].category).toBe(Receipt.ProductCategory.GRAINS);
	});

	it('should fall back to the description when the normalized name is blank', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({
						description: '  ARROZ TIO JOAO 5KG  ',
						normalizedName: '   '
					})
				]
			})
		);

		expect(draft.items[0]).toMatchObject({
			description: 'ARROZ TIO JOAO 5KG',
			displayName: 'ARROZ TIO JOAO 5KG'
		});
	});

	it('should null a blank merchant code', () => {
		const draft = toDraft(
			makeExtraction({
				items: [
					makeExtractionItem({ merchantCode: '  ' }),
					makeExtractionItem({ merchantCode: ' A12 ' })
				]
			})
		);

		expect(draft.items[0].merchantCode).toBeNull();
		expect(draft.items[1].merchantCode).toBe('A12');
	});
});
