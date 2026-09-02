import { Receipt } from '@application/entities/Receipt';
import { CategorySpendItem } from '@infra/database/dynamo/items/CategorySpendItem';
import { makeCategorySpend } from '@test/factories/makeCategorySpend';
import { ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const SK_UPPER_BOUND = '￿';

describe('CategorySpendItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(CategorySpendItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should key the aggregate by month and category', () => {
		expect(
			CategorySpendItem.getSK({
				month: '2026-02',
				category: Receipt.ProductCategory.GRAINS
			})
		).toBe('CATEGORY_SPEND#2026-02#GRAINS');
	});

	it('should have the month prefix start every key of that month', () => {
		const prefix = CategorySpendItem.getSKPrefix({ month: '2026-02' });

		expect(prefix).toBe('CATEGORY_SPEND#2026-02');
		expect(
			CategorySpendItem.getSK({
				month: '2026-02',
				category: Receipt.ProductCategory.SNACKS
			}).startsWith(prefix)
		).toBe(true);
	});

	it('should sort the months chronologically', () => {
		const keys = [
			CategorySpendItem.getSK({
				month: '2026-02',
				category: Receipt.ProductCategory.GRAINS
			}),
			CategorySpendItem.getSK({
				month: '2025-12',
				category: Receipt.ProductCategory.GRAINS
			}),
			CategorySpendItem.getSK({
				month: '2026-10',
				category: Receipt.ProductCategory.GRAINS
			})
		];

		expect([...keys].sort()).toEqual([keys[1], keys[0], keys[2]]);
	});

	it('should include every category of the last month in the period range', () => {
		const from = CategorySpendItem.getSKPrefix({ month: '2026-01' });
		const to = `${CategorySpendItem.getSKPrefix({ month: '2026-03' })}${SK_UPPER_BOUND}`;

		const lastCategory = CategorySpendItem.getSK({
			month: '2026-03',
			category: Receipt.ProductCategory.TOBACCO
		});
		const outside = CategorySpendItem.getSK({
			month: '2026-04',
			category: Receipt.ProductCategory.BAKERY
		});

		expect(lastCategory >= from).toBe(true);
		expect(lastCategory <= to).toBe(true);
		expect(outside <= to).toBe(false);
	});
});

describe('CategorySpendItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = CategorySpendItem.fromEntity({
			entity: makeCategorySpend()
		}).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: 'CATEGORY_SPEND#2026-02#GRAINS',
			type: 'CategorySpend',
			accountId: ACCOUNT_ID,
			month: '2026-02',
			category: Receipt.ProductCategory.GRAINS,
			totalCents: 12345,
			itemCount: 7,
			lastAppliedPurchaseId: PURCHASE_ID,
			createdAt: '2026-02-01T12:00:00.000Z',
			updatedAt: '2026-02-19T17:30:00.000Z'
		});
	});

	it('should store the category as its enum string', () => {
		const item = CategorySpendItem.fromEntity({
			entity: makeCategorySpend({ category: Receipt.ProductCategory.PET })
		}).toItem();

		expect(item.category).toBe('PET');
	});
});

describe('CategorySpendItem round trip', () => {
	it('should rebuild the same aggregate', () => {
		const categorySpend = makeCategorySpend();

		const item = CategorySpendItem.fromEntity({
			entity: categorySpend
		}).toItem();

		expect(CategorySpendItem.toEntity({ item })).toStrictEqual(categorySpend);
	});

	it('should rebuild an aggregate that no purchase has touched yet', () => {
		const categorySpend = makeCategorySpend({
			totalCents: 0,
			itemCount: 0,
			lastAppliedPurchaseId: null
		});

		const item = CategorySpendItem.fromEntity({
			entity: categorySpend
		}).toItem();

		expect(CategorySpendItem.toEntity({ item })).toStrictEqual(categorySpend);
		expect(item.lastAppliedPurchaseId).toBeNull();
	});
});
