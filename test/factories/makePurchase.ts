import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';
import {
	ACCESS_KEY,
	ACCOUNT_ID,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';

export function makePurchase(overrides: Partial<Purchase.Attributes> = {}) {
	return new Purchase({
		id: PURCHASE_ID,
		accountId: ACCOUNT_ID,
		purchasedAt: new Date('2026-02-19T17:30:00.000Z'),
		merchantId: MERCHANT_ID,
		merchantName: 'Supermercado Bom Preço',
		category: Merchant.Category.SUPERMARKET,
		totalCents: 12345,
		discountCents: 500,
		itemCount: 7,
		accessKey: ACCESS_KEY,
		source: Purchase.Source.OCR,
		createdAt: new Date('2026-02-19T18:00:00.000Z'),
		updatedAt: new Date('2026-02-19T18:00:00.000Z'),
		...overrides
	});
}
