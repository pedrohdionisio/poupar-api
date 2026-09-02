import { CategorySpend } from '@application/entities/CategorySpend';
import { Receipt } from '@application/entities/Receipt';
import { makeReceiptItem } from '@test/factories/makeReceiptItem';
import { describe, expect, it } from 'vitest';

describe('CategorySpend.toEntries', () => {
	it('should return no entries for an empty receipt', () => {
		expect(CategorySpend.toEntries({ items: [] })).toEqual([]);
	});

	it('should sum the total and count the items of each category', () => {
		const entries = CategorySpend.toEntries({
			items: [
				makeReceiptItem({
					category: Receipt.ProductCategory.DAIRY,
					totalCents: 500
				}),
				makeReceiptItem({
					category: Receipt.ProductCategory.MEAT,
					totalCents: 3000
				}),
				makeReceiptItem({
					category: Receipt.ProductCategory.DAIRY,
					totalCents: 250
				})
			]
		});

		expect(entries).toEqual([
			{
				category: Receipt.ProductCategory.DAIRY,
				totalCents: 750,
				itemCount: 2
			},
			{ category: Receipt.ProductCategory.MEAT, totalCents: 3000, itemCount: 1 }
		]);
	});

	it('should keep the order of first appearance of each category', () => {
		const entries = CategorySpend.toEntries({
			items: [
				makeReceiptItem({
					category: Receipt.ProductCategory.SNACKS,
					totalCents: 100
				}),
				makeReceiptItem({
					category: Receipt.ProductCategory.BAKERY,
					totalCents: 100
				}),
				makeReceiptItem({
					category: Receipt.ProductCategory.SNACKS,
					totalCents: 100
				})
			]
		});

		expect(entries.map((entry) => entry.category)).toEqual([
			Receipt.ProductCategory.SNACKS,
			Receipt.ProductCategory.BAKERY
		]);
	});
});
