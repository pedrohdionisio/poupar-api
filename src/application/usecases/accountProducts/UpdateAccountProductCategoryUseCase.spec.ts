import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { UpdateAccountProductCategoryUseCase } from '@application/usecases/accountProducts/UpdateAccountProductCategoryUseCase';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { createMock } from '@test/createMock';
import { ACCOUNT_ID, ARROZ_PRODUCT_KEY } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

function makeSut(updated = true) {
	const accountProductRepository = createMock(AccountProductRepository, {
		updateCategory: async () => updated
	});

	const sut = new UpdateAccountProductCategoryUseCase(accountProductRepository);

	return { sut, accountProductRepository };
}

function makeInput() {
	return {
		accountId: ACCOUNT_ID,
		productKey: ARROZ_PRODUCT_KEY,
		category: Receipt.ProductCategory.SNACKS
	};
}

describe('UpdateAccountProductCategoryUseCase', () => {
	it('should record the category as chosen by the user', async () => {
		const { sut, accountProductRepository } = makeSut();

		await sut.execute(makeInput());

		expect(accountProductRepository.updateCategory).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			productKey: ARROZ_PRODUCT_KEY,
			category: Receipt.ProductCategory.SNACKS,
			categorySource: AccountProduct.CategorySource.USER
		});
	});

	it('should throw when the account has no such product', async () => {
		const { sut } = makeSut(false);

		await expect(sut.execute(makeInput())).rejects.toThrow(ResourceNotFound);
	});
});
