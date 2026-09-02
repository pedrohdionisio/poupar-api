import { Merchant } from '@application/entities/Merchant';
import { MerchantItem } from '@infra/database/dynamo/items/MerchantItem';
import { makeMerchant } from '@test/factories/makeMerchant';
import { ACCOUNT_ID, MERCHANT_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

describe('MerchantItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(MerchantItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should key the merchant by its ULID, never by the CNPJ', () => {
		const sk = MerchantItem.getSK({ id: MERCHANT_ID });

		expect(sk).toBe(`MERCHANT#${MERCHANT_ID}`);
		expect(sk).not.toContain('11222333000181');
	});

	it('should list merchants of the account by prefix', () => {
		expect(MerchantItem.getSKPrefix()).toBe('MERCHANT#');
		expect(MerchantItem.getSK({ id: MERCHANT_ID })).toMatch(
			new RegExp(`^${MerchantItem.getSKPrefix()}`)
		);
	});
});

describe('MerchantItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = MerchantItem.fromEntity({ entity: makeMerchant() }).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: `MERCHANT#${MERCHANT_ID}`,
			type: 'Merchant',
			id: MERCHANT_ID,
			accountId: ACCOUNT_ID,
			name: 'Supermercado Bom Preço',
			category: Merchant.Category.SUPERMARKET,
			cnpj: '11222333000181',
			purchaseCount: 3,
			totalSpentCents: 45990,
			firstPurchaseAt: '2026-01-05T12:00:00.000Z',
			lastPurchaseAt: '2026-02-19T17:30:00.000Z',
			lastAppliedPurchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF',
			createdAt: '2026-01-05T11:00:00.000Z',
			updatedAt: '2026-02-19T17:30:00.000Z'
		});
	});

	it('should write an absent value as null instead of dropping the attribute', () => {
		const item = MerchantItem.fromEntity({
			entity: makeMerchant({
				cnpj: null,
				firstPurchaseAt: null,
				lastPurchaseAt: null,
				lastAppliedPurchaseId: null
			})
		}).toItem();

		expect(item.cnpj).toBeNull();
		expect(item.firstPurchaseAt).toBeNull();
		expect(item.lastPurchaseAt).toBeNull();
		expect(item.lastAppliedPurchaseId).toBeNull();
	});
});

describe('MerchantItem round trip', () => {
	it('should rebuild the same merchant', () => {
		const merchant = makeMerchant();

		const item = MerchantItem.fromEntity({ entity: merchant }).toItem();

		expect(MerchantItem.toEntity({ item })).toStrictEqual(merchant);
	});

	it('should rebuild a merchant that never had a purchase', () => {
		const merchant = makeMerchant({
			cnpj: null,
			purchaseCount: 0,
			totalSpentCents: 0,
			firstPurchaseAt: null,
			lastPurchaseAt: null,
			lastAppliedPurchaseId: null
		});

		const item = MerchantItem.fromEntity({ entity: merchant }).toItem();

		expect(MerchantItem.toEntity({ item })).toStrictEqual(merchant);
	});
});
