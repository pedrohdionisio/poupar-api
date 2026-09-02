import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';
import { PurchaseItem } from '@infra/database/dynamo/items/PurchaseItem';
import { makePurchase } from '@test/factories/makePurchase';
import { ACCOUNT_ID, MERCHANT_ID, PURCHASE_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const PURCHASED_AT = '2026-02-19T17:30:00.000Z';

describe('PurchaseItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(PurchaseItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should embed the purchase date and the id in the sort key', () => {
		expect(
			PurchaseItem.getSK({ purchasedAt: PURCHASED_AT, id: PURCHASE_ID })
		).toBe(`PURCHASE#${PURCHASED_AT}#${PURCHASE_ID}`);
	});

	it('should list purchases of the account by prefix', () => {
		expect(PurchaseItem.getSKPrefix()).toBe('PURCHASE#');
	});
});

describe('PurchaseItem sort key ordering', () => {
	it('should sort lexicographically in chronological order', () => {
		const keys = [
			PurchaseItem.getSK({ purchasedAt: '2026-02-19T17:30:00.000Z', id: 'b' }),
			PurchaseItem.getSK({ purchasedAt: '2025-12-31T23:59:59.999Z', id: 'a' }),
			PurchaseItem.getSK({ purchasedAt: '2026-03-01T00:00:00.000Z', id: 'c' })
		];

		expect([...keys].sort()).toEqual([keys[1], keys[0], keys[2]]);
	});

	it('should keep two purchases of the same instant apart by id', () => {
		const first = PurchaseItem.getSK({ purchasedAt: PURCHASED_AT, id: 'a' });
		const second = PurchaseItem.getSK({ purchasedAt: PURCHASED_AT, id: 'b' });

		expect(first).not.toBe(second);
		expect([second, first].sort()).toEqual([first, second]);
	});

	it('should include both range boundaries in the period query', () => {
		const from = PurchaseItem.getSKFrom({ from: '2026-02-01T00:00:00.000Z' });
		const to = PurchaseItem.getSKTo({ to: '2026-02-28T23:59:59.999Z' });

		const firstInstant = PurchaseItem.getSK({
			purchasedAt: '2026-02-01T00:00:00.000Z',
			id: PURCHASE_ID
		});
		const lastInstant = PurchaseItem.getSK({
			purchasedAt: '2026-02-28T23:59:59.999Z',
			id: PURCHASE_ID
		});

		expect(firstInstant >= from).toBe(true);
		expect(lastInstant <= to).toBe(true);
	});

	it('should leave purchases outside the period out of the range', () => {
		const from = PurchaseItem.getSKFrom({ from: '2026-02-01T00:00:00.000Z' });
		const to = PurchaseItem.getSKTo({ to: '2026-02-28T23:59:59.999Z' });

		const before = PurchaseItem.getSK({
			purchasedAt: '2026-01-31T23:59:59.999Z',
			id: PURCHASE_ID
		});
		const after = PurchaseItem.getSK({
			purchasedAt: '2026-03-01T00:00:00.000Z',
			id: PURCHASE_ID
		});

		expect(before >= from).toBe(false);
		expect(after <= to).toBe(false);
	});
});

describe('PurchaseItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = PurchaseItem.fromEntity({ entity: makePurchase() }).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: `PURCHASE#${PURCHASED_AT}#${PURCHASE_ID}`,
			type: 'Purchase',
			id: PURCHASE_ID,
			accountId: ACCOUNT_ID,
			purchasedAt: PURCHASED_AT,
			merchantId: MERCHANT_ID,
			merchantName: 'Supermercado Bom Preço',
			category: Merchant.Category.SUPERMARKET,
			totalCents: 12345,
			discountCents: 500,
			itemCount: 7,
			accessKey: '3'.repeat(44),
			source: Purchase.Source.OCR,
			createdAt: '2026-02-19T18:00:00.000Z',
			updatedAt: '2026-02-19T18:00:00.000Z'
		});
	});

	it('should keep the merchant snapshot taken at import time', () => {
		const item = PurchaseItem.fromEntity({
			entity: makePurchase({ merchantName: 'Nome Antigo' })
		}).toItem();

		expect(item.merchantName).toBe('Nome Antigo');
		expect(item.category).toBe(Merchant.Category.SUPERMARKET);
	});
});

describe('PurchaseItem round trip', () => {
	it('should rebuild the same purchase', () => {
		const purchase = makePurchase();

		const item = PurchaseItem.fromEntity({ entity: purchase }).toItem();

		expect(PurchaseItem.toEntity({ item })).toStrictEqual(purchase);
	});

	it('should rebuild a manual purchase without an access key', () => {
		const purchase = makePurchase({
			accessKey: null,
			source: Purchase.Source.MANUAL
		});

		const item = PurchaseItem.fromEntity({ entity: purchase }).toItem();

		expect(PurchaseItem.toEntity({ item })).toStrictEqual(purchase);
		expect(item.accessKey).toBeNull();
	});

	it('should keep the amounts as integer cents', () => {
		const purchase = makePurchase({ totalCents: 12345, discountCents: 500 });

		const item = PurchaseItem.fromEntity({ entity: purchase }).toItem();
		const entity = PurchaseItem.toEntity({ item });

		expect(Number.isInteger(entity.totalCents)).toBe(true);
		expect(entity.totalCents).toBe(12345);
		expect(entity.discountCents).toBe(500);
	});
});
