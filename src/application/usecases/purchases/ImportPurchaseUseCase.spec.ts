import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';
import { Receipt } from '@application/entities/Receipt';
import { ReceiptAlreadyImported } from '@application/errors/application/ReceiptAlreadyImported';
import { ResourceAlreadyExists } from '@application/errors/application/ResourceAlreadyExists';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ImportPurchaseUseCase } from '@application/usecases/purchases/ImportPurchaseUseCase';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { CategorySpendRepository } from '@infra/database/dynamo/repositories/CategorySpendRepository';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PricePointRepository } from '@infra/database/dynamo/repositories/PricePointRepository';
import { PurchaseDedupeRepository } from '@infra/database/dynamo/repositories/PurchaseDedupeRepository';
import { PurchaseTransactionRepository } from '@infra/database/dynamo/repositories/PurchaseTransactionRepository';
import { createMock } from '@test/createMock';
import { makeMerchant } from '@test/factories/makeMerchant';
import { makePayloadItem } from '@test/factories/makePayloadItem';
import { makePurchaseDedupe } from '@test/factories/makePurchaseDedupe';
import {
	ACCESS_KEY,
	ACCOUNT_ID,
	ARROZ_PRODUCT_KEY,
	LEITE_PRODUCT_KEY,
	MERCHANT_ID,
	PURCHASE_ID
} from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const EXISTING_PURCHASE_ID = PURCHASE_ID;
const ARROZ_KEY = ARROZ_PRODUCT_KEY;
const LEITE_KEY = LEITE_PRODUCT_KEY;

function makeInput(
	overrides: Partial<ImportPurchaseUseCase.Input> = {}
): ImportPurchaseUseCase.Input {
	return {
		accountId: ACCOUNT_ID,
		source: Purchase.Source.OCR,
		purchasedAt: '2026-02-19T17:30:00.000Z',
		accessKey: ACCESS_KEY,
		photoS3Key: 'scans/photo.jpg',
		ocrS3Key: 'scans/ocr.json',
		merchantId: MERCHANT_ID,
		totalCents: 2500,
		discountCents: 0,
		items: [makePayloadItem()],
		...overrides
	};
}

type Dependencies = {
	merchant?: Merchant | null;
	knownProducts?: Awaited<
		ReturnType<AccountProductRepository['getByProductKeys']>
	>;
	createError?: Error;
	imported?: ReturnType<typeof makePurchaseDedupe> | null;
};

function makeSut(dependencies: Dependencies = {}) {
	const {
		merchant = makeMerchant(),
		knownProducts = [],
		createError,
		imported = null
	} = dependencies;

	const merchantRepository = createMock(MerchantRepository, {
		getById: async () => merchant
	});
	const purchaseTransactionRepository = createMock(
		PurchaseTransactionRepository,
		{
			create: async () => {
				if (createError) {
					throw createError;
				}
			}
		}
	);
	const purchaseDedupeRepository = createMock(PurchaseDedupeRepository, {
		getByAccessKey: async () => imported
	});
	const accountProductRepository = createMock(AccountProductRepository, {
		getByProductKeys: async () => knownProducts
	});
	const pricePointRepository = createMock(PricePointRepository);
	const categorySpendRepository = createMock(CategorySpendRepository);

	const sut = new ImportPurchaseUseCase(
		merchantRepository,
		purchaseTransactionRepository,
		purchaseDedupeRepository,
		accountProductRepository,
		pricePointRepository,
		categorySpendRepository
	);

	return {
		sut,
		merchantRepository,
		purchaseTransactionRepository,
		purchaseDedupeRepository,
		accountProductRepository,
		pricePointRepository,
		categorySpendRepository
	};
}

describe('ImportPurchaseUseCase merchant', () => {
	it('should throw when the merchant does not belong to the account', async () => {
		const { sut, purchaseTransactionRepository } = makeSut({ merchant: null });

		await expect(sut.execute(makeInput())).rejects.toThrow(ResourceNotFound);
		expect(purchaseTransactionRepository.create).not.toHaveBeenCalled();
	});

	it('should snapshot the merchant name and category into the purchase', async () => {
		const { sut, purchaseTransactionRepository } = makeSut({
			merchant: makeMerchant({
				name: 'Mercado da Esquina',
				category: Merchant.Category.OTHER
			})
		});

		await sut.execute(makeInput());

		const [{ purchase }] = purchaseTransactionRepository.create.mock.calls[0]!;

		expect(purchase.merchantName).toBe('Mercado da Esquina');
		expect(purchase.category).toBe(Merchant.Category.OTHER);
	});
});

describe('ImportPurchaseUseCase creation', () => {
	it('should return the created purchase', async () => {
		const { sut } = makeSut();

		const output = await sut.execute(makeInput());

		expect(output).toStrictEqual({
			purchaseId: expect.any(String),
			purchasedAt: new Date('2026-02-19T17:30:00.000Z'),
			itemCount: 1,
			totalCents: 2500
		});
	});

	it('should write the purchase, the receipt and the dedupe in one transaction', async () => {
		const { sut, purchaseTransactionRepository } = makeSut();

		const { purchaseId } = await sut.execute(makeInput());

		const [{ purchase, receipt, purchaseDedupe }] =
			purchaseTransactionRepository.create.mock.calls[0]!;

		expect(purchase.id).toBe(purchaseId);
		expect(receipt.purchaseId).toBe(purchaseId);
		expect(purchaseDedupe?.accessKey).toBe(ACCESS_KEY);
		expect(purchaseDedupe?.purchaseId).toBe(purchaseId);
	});

	it('should not create a dedupe for a purchase without an access key', async () => {
		const { sut, purchaseTransactionRepository } = makeSut();

		await sut.execute(makeInput({ accessKey: null }));

		const [{ purchaseDedupe }] =
			purchaseTransactionRepository.create.mock.calls[0]!;

		expect(purchaseDedupe).toBeNull();
	});

	it('should count the consolidated items, not the payload lines', async () => {
		const { sut } = makeSut();

		const output = await sut.execute(
			makeInput({
				items: [
					makePayloadItem({ seq: 1, totalCents: 2500 }),
					makePayloadItem({ seq: 2, totalCents: 2500 })
				],
				totalCents: 5000
			})
		);

		expect(output.itemCount).toBe(1);
	});
});

describe('ImportPurchaseUseCase categories', () => {
	it('should let the category already known by the account beat the payload', async () => {
		const { sut, purchaseTransactionRepository } = makeSut({
			knownProducts: [
				{ productKey: ARROZ_KEY, category: Receipt.ProductCategory.SNACKS }
			] as Awaited<ReturnType<AccountProductRepository['getByProductKeys']>>
		});

		await sut.execute(makeInput());

		const [{ receipt }] = purchaseTransactionRepository.create.mock.calls[0]!;

		expect(receipt.items[0].category).toBe(Receipt.ProductCategory.SNACKS);
	});

	it('should keep the payload category for an unknown product', async () => {
		const { sut, purchaseTransactionRepository, accountProductRepository } =
			makeSut();

		await sut.execute(
			makeInput({
				items: [
					makePayloadItem(),
					makePayloadItem({
						seq: 2,
						description: 'LEITE INTEGRAL 1L',
						category: Receipt.ProductCategory.DAIRY
					})
				]
			})
		);

		const [{ receipt }] = purchaseTransactionRepository.create.mock.calls[0]!;

		expect(receipt.items[1].category).toBe(Receipt.ProductCategory.DAIRY);
		expect(accountProductRepository.getByProductKeys).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			productKeys: [ARROZ_KEY, LEITE_KEY]
		});
	});
});

describe('ImportPurchaseUseCase projections', () => {
	it('should apply the purchase to the merchant totals', async () => {
		const { sut, merchantRepository } = makeSut();

		const { purchaseId } = await sut.execute(makeInput());

		expect(merchantRepository.applyPurchase).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			merchantId: MERCHANT_ID,
			purchaseId,
			totalCents: 2500,
			purchasedAt: new Date('2026-02-19T17:30:00.000Z')
		});
	});

	it('should aggregate the spend into the Brazilian month of the purchase', async () => {
		const { sut, categorySpendRepository } = makeSut();

		const { purchaseId } = await sut.execute(
			makeInput({ purchasedAt: '2026-03-01T02:59:00.000Z' })
		);

		expect(categorySpendRepository.applyPurchase).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			purchaseId,
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

	it('should create one price point per consolidated item', async () => {
		const { sut, pricePointRepository } = makeSut();

		await sut.execute(
			makeInput({
				items: [
					makePayloadItem(),
					makePayloadItem({ seq: 2, description: 'LEITE INTEGRAL 1L' })
				]
			})
		);

		const [{ pricePoints }] = pricePointRepository.createMany.mock.calls[0]!;

		expect(pricePoints).toHaveLength(2);
		expect(pricePoints.map((pricePoint) => pricePoint.productKey)).toEqual([
			ARROZ_KEY,
			LEITE_KEY
		]);
	});

	it('should apply every item to its account product', async () => {
		const { sut, accountProductRepository } = makeSut();

		const { purchaseId } = await sut.execute(makeInput());

		expect(accountProductRepository.applyPurchaseItem).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			productKey: ARROZ_KEY,
			name: 'ARROZ TIO JOAO 5KG',
			normalizedName: 'ARROZ TIO JOAO 5KG',
			category: Receipt.ProductCategory.GRAINS,
			gtin: null,
			unit: Receipt.Unit.UN,
			merchantId: MERCHANT_ID,
			unitPriceCents: 2500,
			purchaseId,
			purchasedAt: new Date('2026-02-19T17:30:00.000Z')
		});
	});
});

describe('ImportPurchaseUseCase duplicate receipt', () => {
	it('should report the purchase that already holds the access key', async () => {
		const { sut } = makeSut({
			createError: new ResourceAlreadyExists(),
			imported: makePurchaseDedupe()
		});

		await expect(sut.execute(makeInput())).rejects.toMatchObject({
			name: 'ReceiptAlreadyImported',
			details: { purchaseId: EXISTING_PURCHASE_ID }
		});
	});

	it('should reapply the projections to the purchase that already exists', async () => {
		const { sut, merchantRepository } = makeSut({
			createError: new ResourceAlreadyExists(),
			imported: makePurchaseDedupe()
		});

		await expect(sut.execute(makeInput())).rejects.toThrow(
			ReceiptAlreadyImported
		);

		expect(merchantRepository.applyPurchase).toHaveBeenCalledWith(
			expect.objectContaining({ purchaseId: EXISTING_PURCHASE_ID })
		);
	});

	it('should report the conflict without a purchase id when the dedupe is gone', async () => {
		const { sut, merchantRepository } = makeSut({
			createError: new ResourceAlreadyExists(),
			imported: null
		});

		const error = await sut
			.execute(makeInput())
			.catch((thrown: unknown) => thrown);

		expect(error).toBeInstanceOf(ReceiptAlreadyImported);
		expect((error as ReceiptAlreadyImported).details).toBeUndefined();
		expect(merchantRepository.applyPurchase).not.toHaveBeenCalled();
	});

	it('should rethrow the conflict when there is no access key to blame', async () => {
		const error = new ResourceAlreadyExists();
		const { sut, purchaseDedupeRepository } = makeSut({ createError: error });

		await expect(sut.execute(makeInput({ accessKey: null }))).rejects.toBe(
			error
		);
		expect(purchaseDedupeRepository.getByAccessKey).not.toHaveBeenCalled();
	});

	it('should rethrow any other failure of the transaction', async () => {
		const error = new Error('dynamo is down');
		const { sut, merchantRepository } = makeSut({ createError: error });

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(merchantRepository.applyPurchase).not.toHaveBeenCalled();
	});
});
