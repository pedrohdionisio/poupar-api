import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';
import { AccountProductItem } from '@infra/database/dynamo/items/AccountProductItem';
import { makeAccountProduct } from '@test/factories/makeAccountProduct';
import {
	ACCOUNT_ID,
	ARROZ_PRODUCT_KEY,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const PRODUCT_KEY = ARROZ_PRODUCT_KEY;

describe('AccountProductItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(AccountProductItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should key the product by the bare sha1, with no inner prefix', () => {
		const sk = AccountProductItem.getSK({ productKey: PRODUCT_KEY });

		expect(sk).toBe(`PRODUCT#${PRODUCT_KEY}`);
		expect(sk).not.toContain('GTIN#');
		expect(sk).not.toContain('NAME#');
	});

	it('should keep the product key usable in a URL', () => {
		expect(PRODUCT_KEY).toMatch(/^[a-f0-9]{40}$/);
		expect(encodeURIComponent(PRODUCT_KEY)).toBe(PRODUCT_KEY);
	});

	it('should list products of the account by prefix', () => {
		expect(AccountProductItem.getSKPrefix()).toBe('PRODUCT#');
	});
});

describe('AccountProductItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = AccountProductItem.fromEntity({
			entity: makeAccountProduct()
		}).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: `PRODUCT#${PRODUCT_KEY}`,
			type: 'AccountProduct',
			accountId: ACCOUNT_ID,
			productKey: PRODUCT_KEY,
			name: 'Arroz Tio João 5kg',
			normalizedName: 'ARROZ TIO JOAO 5KG',
			category: Receipt.ProductCategory.GRAINS,
			categorySource: AccountProduct.CategorySource.AI,
			gtin: '7891000317211',
			unit: Receipt.Unit.UN,
			lastUnitPriceCents: 2500,
			previousUnitPriceCents: 2400,
			minPriceCents: 2300,
			maxPriceCents: 2600,
			lastPurchaseAt: '2026-02-19T17:30:00.000Z',
			lastMerchantId: MERCHANT_ID,
			purchaseCount: 4,
			lastAppliedPurchaseId: PURCHASE_ID,
			createdAt: '2026-01-05T12:00:00.000Z',
			updatedAt: '2026-02-19T17:30:00.000Z'
		});
	});

	it('should write an absent value as null instead of dropping the attribute', () => {
		const item = AccountProductItem.fromEntity({
			entity: makeAccountProduct({ gtin: null, previousUnitPriceCents: null })
		}).toItem();

		expect(item.gtin).toBeNull();
		expect(item.previousUnitPriceCents).toBeNull();
	});
});

describe('AccountProductItem round trip', () => {
	it('should rebuild the same product', () => {
		const accountProduct = makeAccountProduct();

		const item = AccountProductItem.fromEntity({
			entity: accountProduct
		}).toItem();

		expect(AccountProductItem.toEntity({ item })).toStrictEqual(accountProduct);
	});

	it('should rebuild a product bought only once', () => {
		const accountProduct = makeAccountProduct({
			gtin: null,
			previousUnitPriceCents: null,
			purchaseCount: 1,
			minPriceCents: 2500,
			maxPriceCents: 2500
		});

		const item = AccountProductItem.fromEntity({
			entity: accountProduct
		}).toItem();

		expect(AccountProductItem.toEntity({ item })).toStrictEqual(accountProduct);
	});

	it('should keep the category chosen by the user', () => {
		const accountProduct = makeAccountProduct({
			category: Receipt.ProductCategory.SNACKS,
			categorySource: AccountProduct.CategorySource.USER
		});

		const item = AccountProductItem.fromEntity({
			entity: accountProduct
		}).toItem();
		const entity = AccountProductItem.toEntity({ item });

		expect(entity.category).toBe(Receipt.ProductCategory.SNACKS);
		expect(entity.categorySource).toBe(AccountProduct.CategorySource.USER);
	});
});
