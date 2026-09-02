import { CategorySpend } from '@application/entities/CategorySpend';
import { Receipt } from '@application/entities/Receipt';
import { ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';

export function makeCategorySpend(
	overrides: Partial<CategorySpend.Attributes> = {}
) {
	return new CategorySpend({
		accountId: ACCOUNT_ID,
		month: '2026-02',
		category: Receipt.ProductCategory.GRAINS,
		totalCents: 12345,
		itemCount: 7,
		lastAppliedPurchaseId: PURCHASE_ID,
		createdAt: new Date('2026-02-01T12:00:00.000Z'),
		updatedAt: new Date('2026-02-19T17:30:00.000Z'),
		...overrides
	});
}
