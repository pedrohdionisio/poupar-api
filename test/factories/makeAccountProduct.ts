import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';
import {
	ACCOUNT_ID,
	ARROZ_GTIN,
	ARROZ_PRODUCT_KEY,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';

export function makeAccountProduct(
	overrides: Partial<AccountProduct.Attributes> = {}
) {
	return new AccountProduct({
		accountId: ACCOUNT_ID,
		productKey: ARROZ_PRODUCT_KEY,
		name: 'Arroz Tio João 5kg',
		normalizedName: 'ARROZ TIO JOAO 5KG',
		category: Receipt.ProductCategory.GRAINS,
		categorySource: AccountProduct.CategorySource.AI,
		gtin: ARROZ_GTIN,
		unit: Receipt.Unit.UN,
		lastUnitPriceCents: 2500,
		previousUnitPriceCents: 2400,
		minPriceCents: 2300,
		maxPriceCents: 2600,
		lastPurchaseAt: new Date('2026-02-19T17:30:00.000Z'),
		lastMerchantId: MERCHANT_ID,
		purchaseCount: 4,
		lastAppliedPurchaseId: PURCHASE_ID,
		createdAt: new Date('2026-01-05T12:00:00.000Z'),
		updatedAt: new Date('2026-02-19T17:30:00.000Z'),
		...overrides
	});
}
