import { Receipt } from '@application/entities/Receipt';
import { PricePointItem } from '@infra/database/dynamo/items/PricePointItem';
import { makePricePoint } from '@test/factories/makePricePoint';
import {
	ACCOUNT_ID,
	ARROZ_PRODUCT_KEY,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const PRODUCT_KEY = ARROZ_PRODUCT_KEY;
const PURCHASED_AT = '2026-02-19T17:30:00.000Z';

describe('PricePointItem.keys', () => {
	it('should use a partition derived from the account and the product', () => {
		expect(
			PricePointItem.getPK({
				accountId: ACCOUNT_ID,
				productKey: PRODUCT_KEY
			})
		).toBe(`ACCOUNT#${ACCOUNT_ID}#PRODUCT#${PRODUCT_KEY}`);
	});

	it('should embed the purchase date and the purchase id in the sort key', () => {
		expect(
			PricePointItem.getSK({
				purchasedAt: PURCHASED_AT,
				purchaseId: PURCHASE_ID
			})
		).toBe(`PRICE#${PURCHASED_AT}#${PURCHASE_ID}`);
	});

	it('should list the price series by prefix', () => {
		expect(PricePointItem.getSKPrefix()).toBe('PRICE#');
	});

	it('should sort the series lexicographically in chronological order', () => {
		const keys = [
			PricePointItem.getSK({ purchasedAt: PURCHASED_AT, purchaseId: 'b' }),
			PricePointItem.getSK({
				purchasedAt: '2025-12-31T23:59:59.999Z',
				purchaseId: 'a'
			}),
			PricePointItem.getSK({
				purchasedAt: '2026-03-01T00:00:00.000Z',
				purchaseId: 'c'
			})
		];

		expect([...keys].sort()).toEqual([keys[1], keys[0], keys[2]]);
	});
});

describe('PricePointItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = PricePointItem.fromEntity({
			entity: makePricePoint()
		}).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}#PRODUCT#${PRODUCT_KEY}`,
			SK: `PRICE#${PURCHASED_AT}#${PURCHASE_ID}`,
			type: 'PricePoint',
			accountId: ACCOUNT_ID,
			productKey: PRODUCT_KEY,
			purchaseId: PURCHASE_ID,
			purchasedAt: PURCHASED_AT,
			merchantId: MERCHANT_ID,
			unitPriceCents: 2500,
			quantityMilli: 1000,
			unit: Receipt.Unit.UN
		});
	});

	it('should carry no timestamps of its own, since the price point is immutable', () => {
		const item = PricePointItem.fromEntity({
			entity: makePricePoint()
		}).toItem();

		expect(item).not.toHaveProperty('createdAt');
		expect(item).not.toHaveProperty('updatedAt');
	});
});

describe('PricePointItem round trip', () => {
	it('should rebuild the same price point', () => {
		const pricePoint = makePricePoint();

		const item = PricePointItem.fromEntity({ entity: pricePoint }).toItem();

		expect(PricePointItem.toEntity({ item })).toStrictEqual(pricePoint);
	});

	it('should keep a fractional quantity as an integer in milli', () => {
		const pricePoint = makePricePoint({
			quantityMilli: 384,
			unit: Receipt.Unit.KG
		});

		const item = PricePointItem.fromEntity({ entity: pricePoint }).toItem();
		const entity = PricePointItem.toEntity({ item });

		expect(Number.isInteger(entity.quantityMilli)).toBe(true);
		expect(entity.quantityMilli).toBe(384);
		expect(entity.unit).toBe(Receipt.Unit.KG);
	});
});
