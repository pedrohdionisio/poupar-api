import { PricePoint } from '@application/entities/PricePoint';
import { Receipt } from '@application/entities/Receipt';
import {
	ACCOUNT_ID,
	ARROZ_PRODUCT_KEY,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';

export function makePricePoint(overrides: Partial<PricePoint.Attributes> = {}) {
	return new PricePoint({
		accountId: ACCOUNT_ID,
		productKey: ARROZ_PRODUCT_KEY,
		purchaseId: PURCHASE_ID,
		purchasedAt: new Date('2026-02-19T17:30:00.000Z'),
		merchantId: MERCHANT_ID,
		unitPriceCents: 2500,
		quantityMilli: 1000,
		unit: Receipt.Unit.UN,
		...overrides
	});
}
