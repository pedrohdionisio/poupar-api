import { Merchant } from '@application/entities/Merchant';
import { ACCOUNT_ID, MERCHANT_ID, PURCHASE_ID } from '@test/fixtures';

export function makeMerchant(overrides: Partial<Merchant.Attributes> = {}) {
	return new Merchant({
		id: MERCHANT_ID,
		accountId: ACCOUNT_ID,
		name: 'Supermercado Bom Preço',
		category: Merchant.Category.SUPERMARKET,
		cnpj: '11222333000181',
		purchaseCount: 3,
		totalSpentCents: 45990,
		firstPurchaseAt: new Date('2026-01-05T12:00:00.000Z'),
		lastPurchaseAt: new Date('2026-02-19T17:30:00.000Z'),
		lastAppliedPurchaseId: PURCHASE_ID,
		createdAt: new Date('2026-01-05T11:00:00.000Z'),
		updatedAt: new Date('2026-02-19T17:30:00.000Z'),
		...overrides
	});
}
