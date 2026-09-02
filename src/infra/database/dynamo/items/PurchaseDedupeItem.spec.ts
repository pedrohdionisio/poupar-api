import { PurchaseDedupeItem } from '@infra/database/dynamo/items/PurchaseDedupeItem';
import { makePurchaseDedupe } from '@test/factories/makePurchaseDedupe';
import { ACCESS_KEY, ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

describe('PurchaseDedupeItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(PurchaseDedupeItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should key the dedupe by the natural access key of the receipt', () => {
		expect(PurchaseDedupeItem.getSK({ accessKey: ACCESS_KEY })).toBe(
			`ACCESS_KEY#${ACCESS_KEY}`
		);
	});

	it('should give the same key for the same receipt of the same account', () => {
		expect(PurchaseDedupeItem.getSK({ accessKey: ACCESS_KEY })).toBe(
			PurchaseDedupeItem.getSK({ accessKey: ACCESS_KEY })
		);
	});
});

describe('PurchaseDedupeItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = PurchaseDedupeItem.fromEntity({
			entity: makePurchaseDedupe()
		}).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: `ACCESS_KEY#${ACCESS_KEY}`,
			type: 'PurchaseDedupe',
			accountId: ACCOUNT_ID,
			accessKey: ACCESS_KEY,
			purchaseId: PURCHASE_ID,
			createdAt: '2026-02-19T18:00:00.000Z'
		});
	});

	it('should not carry an updated date, since the dedupe is immutable', () => {
		const item = PurchaseDedupeItem.fromEntity({
			entity: makePurchaseDedupe()
		}).toItem();

		expect(item).not.toHaveProperty('updatedAt');
	});
});

describe('PurchaseDedupeItem round trip', () => {
	it('should rebuild the same dedupe', () => {
		const purchaseDedupe = makePurchaseDedupe();

		const item = PurchaseDedupeItem.fromEntity({
			entity: purchaseDedupe
		}).toItem();

		expect(PurchaseDedupeItem.toEntity({ item })).toStrictEqual(purchaseDedupe);
	});
});
