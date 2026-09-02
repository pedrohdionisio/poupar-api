import { PurchaseDedupe } from '@application/entities/PurchaseDedupe';
import { ACCESS_KEY, ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';

export function makePurchaseDedupe(
	overrides: Partial<PurchaseDedupe.Attributes> = {}
) {
	return new PurchaseDedupe({
		accountId: ACCOUNT_ID,
		accessKey: ACCESS_KEY,
		purchaseId: PURCHASE_ID,
		createdAt: new Date('2026-02-19T18:00:00.000Z'),
		...overrides
	});
}
