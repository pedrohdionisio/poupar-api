import { Purchase } from '@application/entities/Purchase';
import { Receipt } from '@application/entities/Receipt';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { DeletePurchaseUseCase } from '@application/usecases/purchases/DeletePurchaseUseCase';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { CategorySpendRepository } from '@infra/database/dynamo/repositories/CategorySpendRepository';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PricePointRepository } from '@infra/database/dynamo/repositories/PricePointRepository';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { PurchaseTransactionRepository } from '@infra/database/dynamo/repositories/PurchaseTransactionRepository';
import { ReceiptRepository } from '@infra/database/dynamo/repositories/ReceiptRepository';
import { createMock } from '@test/createMock';
import { makeMerchant } from '@test/factories/makeMerchant';
import { makePricePoint } from '@test/factories/makePricePoint';
import { makePurchase } from '@test/factories/makePurchase';
import { makeReceipt } from '@test/factories/makeReceipt';
import { makeReceiptItem } from '@test/factories/makeReceiptItem';
import {
	ACCOUNT_ID,
	ARROZ_PRODUCT_KEY,
	LEITE_PRODUCT_KEY,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const PURCHASED_AT = '2026-02-19T17:30:00.000Z';

type Dependencies = {
	purchase?: Purchase | null;
	receipt?: Receipt | null;
	merchant?: ReturnType<typeof makeMerchant> | null;
	series?: ReturnType<typeof makePricePoint>[];
};

function makeSut(dependencies: Dependencies = {}) {
	const {
		purchase = makePurchase(),
		receipt = makeReceipt(),
		merchant = makeMerchant(),
		series = [makePricePoint()]
	} = dependencies;

	const purchaseRepository = createMock(PurchaseRepository, {
		getById: async () => purchase
	});
	const receiptRepository = createMock(ReceiptRepository, {
		getByPurchaseId: async () => receipt
	});
	const pricePointRepository = createMock(PricePointRepository, {
		listByProduct: async () => series
	});
	const accountProductRepository = createMock(AccountProductRepository);
	const merchantRepository = createMock(MerchantRepository, {
		getById: async () => merchant
	});
	const categorySpendRepository = createMock(CategorySpendRepository);
	const purchaseTransactionRepository = createMock(
		PurchaseTransactionRepository
	);

	const sut = new DeletePurchaseUseCase(
		purchaseRepository,
		receiptRepository,
		pricePointRepository,
		accountProductRepository,
		merchantRepository,
		categorySpendRepository,
		purchaseTransactionRepository
	);

	return {
		sut,
		purchaseRepository,
		receiptRepository,
		pricePointRepository,
		accountProductRepository,
		merchantRepository,
		categorySpendRepository,
		purchaseTransactionRepository
	};
}

function makeInput() {
	return {
		accountId: ACCOUNT_ID,
		id: PURCHASE_ID,
		purchasedAt: PURCHASED_AT
	};
}

describe('DeletePurchaseUseCase guards', () => {
	it('should throw when the purchase does not belong to the account', async () => {
		const { sut, purchaseTransactionRepository, pricePointRepository } =
			makeSut({ purchase: null });

		await expect(sut.execute(makeInput())).rejects.toThrow(ResourceNotFound);
		expect(pricePointRepository.deleteMany).not.toHaveBeenCalled();
		expect(purchaseTransactionRepository.deleteCascade).not.toHaveBeenCalled();
	});

	it('should normalize the purchase date before looking the purchase up', async () => {
		const { sut, purchaseRepository } = makeSut();

		await sut.execute({ ...makeInput(), purchasedAt: '2026-02-19T17:30:00Z' });

		expect(purchaseRepository.getById).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			purchasedAt: PURCHASED_AT,
			id: PURCHASE_ID
		});
	});
});

describe('DeletePurchaseUseCase price points', () => {
	it('should delete the price points of every product of the receipt', async () => {
		const { sut, pricePointRepository } = makeSut({
			receipt: makeReceipt({
				items: [
					makeReceiptItem({ productKey: ARROZ_PRODUCT_KEY }),
					makeReceiptItem({ seq: 2, productKey: LEITE_PRODUCT_KEY })
				]
			})
		});

		await sut.execute(makeInput());

		expect(pricePointRepository.deleteMany).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			productKeys: [ARROZ_PRODUCT_KEY, LEITE_PRODUCT_KEY],
			purchasedAt: new Date(PURCHASED_AT),
			purchaseId: PURCHASE_ID
		});
	});

	it('should deduplicate products that appear twice in the receipt', async () => {
		const { sut, pricePointRepository } = makeSut({
			receipt: makeReceipt({
				items: [
					makeReceiptItem({ productKey: ARROZ_PRODUCT_KEY }),
					makeReceiptItem({ seq: 2, productKey: ARROZ_PRODUCT_KEY })
				]
			})
		});

		await sut.execute(makeInput());

		expect(pricePointRepository.deleteMany).toHaveBeenCalledWith(
			expect.objectContaining({ productKeys: [ARROZ_PRODUCT_KEY] })
		);
	});
});

describe('DeletePurchaseUseCase account product rebuild', () => {
	it('should drop the product when no price point is left', async () => {
		const { sut, accountProductRepository } = makeSut({ series: [] });

		await sut.execute(makeInput());

		expect(accountProductRepository.delete).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			productKey: ARROZ_PRODUCT_KEY
		});
		expect(accountProductRepository.rebuildFromSeries).not.toHaveBeenCalled();
	});

	it('should rebuild the product from the remaining series', async () => {
		const { sut, accountProductRepository } = makeSut({
			series: [
				makePricePoint({ unitPriceCents: 2300 }),
				makePricePoint({ unitPriceCents: 2600 }),
				makePricePoint({
					unitPriceCents: 2500,
					purchasedAt: new Date('2026-02-10T12:00:00.000Z'),
					purchaseId: 'last-purchase'
				})
			]
		});

		await sut.execute(makeInput());

		expect(accountProductRepository.rebuildFromSeries).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			productKey: ARROZ_PRODUCT_KEY,
			purchaseCount: 3,
			minPriceCents: 2300,
			maxPriceCents: 2600,
			lastUnitPriceCents: 2500,
			previousUnitPriceCents: 2600,
			lastPurchaseAt: new Date('2026-02-10T12:00:00.000Z'),
			lastMerchantId: MERCHANT_ID,
			unit: Receipt.Unit.UN,
			lastAppliedPurchaseId: 'last-purchase'
		});
		expect(accountProductRepository.delete).not.toHaveBeenCalled();
	});

	it('should leave a single remaining purchase with no previous price', async () => {
		const { sut, accountProductRepository } = makeSut({
			series: [makePricePoint({ unitPriceCents: 2500 })]
		});

		await sut.execute(makeInput());

		expect(accountProductRepository.rebuildFromSeries).toHaveBeenCalledWith(
			expect.objectContaining({
				purchaseCount: 1,
				minPriceCents: 2500,
				maxPriceCents: 2500,
				previousUnitPriceCents: null
			})
		);
	});
});

describe('DeletePurchaseUseCase aggregates', () => {
	it('should revert the spend from the Brazilian month of the purchase', async () => {
		const { sut, categorySpendRepository } = makeSut({
			purchase: makePurchase({
				purchasedAt: new Date('2026-03-01T02:59:00.000Z')
			})
		});

		await sut.execute(makeInput());

		expect(categorySpendRepository.revertPurchase).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			month: '2026-02',
			entries: [
				{
					category: Receipt.ProductCategory.GRAINS,
					totalCents: 2500,
					itemCount: 1
				}
			]
		});
	});

	it('should delete the purchase and revert the merchant totals', async () => {
		const { sut, purchaseTransactionRepository } = makeSut();

		await sut.execute(makeInput());

		const [{ purchase, revertMerchant }] =
			purchaseTransactionRepository.deleteCascade.mock.calls[0]!;

		expect(purchase.id).toBe(PURCHASE_ID);
		expect(revertMerchant).toBe(true);
	});

	it('should not revert a merchant that no longer exists', async () => {
		const { sut, purchaseTransactionRepository } = makeSut({ merchant: null });

		await sut.execute(makeInput());

		expect(purchaseTransactionRepository.deleteCascade).toHaveBeenCalledWith(
			expect.objectContaining({ revertMerchant: false })
		);
	});
});

describe('DeletePurchaseUseCase without a receipt', () => {
	it('should still delete the purchase when the receipt is gone', async () => {
		const { sut, purchaseTransactionRepository, pricePointRepository } =
			makeSut({ receipt: null });

		await sut.execute(makeInput());

		expect(pricePointRepository.deleteMany).toHaveBeenCalledWith(
			expect.objectContaining({ productKeys: [] })
		);
		expect(purchaseTransactionRepository.deleteCascade).toHaveBeenCalled();
	});

	it('should revert no category spend when the receipt is gone', async () => {
		const { sut, categorySpendRepository } = makeSut({ receipt: null });

		await sut.execute(makeInput());

		expect(categorySpendRepository.revertPurchase).toHaveBeenCalledWith(
			expect.objectContaining({ entries: [] })
		);
	});
});
