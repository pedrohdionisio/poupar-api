import { Receipt } from '@application/entities/Receipt';
import { ListCategorySpendsUseCase } from '@application/usecases/categorySpends/ListCategorySpendsUseCase';
import { CategorySpendRepository } from '@infra/database/dynamo/repositories/CategorySpendRepository';
import { createMock } from '@test/createMock';
import { makeCategorySpend } from '@test/factories/makeCategorySpend';
import { ACCOUNT_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

function makeSut(categorySpends: ReturnType<typeof makeCategorySpend>[] = []) {
	const categorySpendRepository = createMock(CategorySpendRepository, {
		listByPeriod: async () => categorySpends
	});

	const sut = new ListCategorySpendsUseCase(categorySpendRepository);

	return { sut, categorySpendRepository };
}

function makeInput() {
	return { accountId: ACCOUNT_ID, from: '2026-01', to: '2026-03' };
}

describe('ListCategorySpendsUseCase', () => {
	it('should query the repository for the requested period', async () => {
		const { sut, categorySpendRepository } = makeSut();

		await sut.execute(makeInput());

		expect(categorySpendRepository.listByPeriod).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			from: '2026-01',
			to: '2026-03'
		});
	});

	it('should return only the fields the chart needs', async () => {
		const { sut } = makeSut([makeCategorySpend()]);

		const output = await sut.execute(makeInput());

		expect(output).toStrictEqual([
			{
				month: '2026-02',
				category: Receipt.ProductCategory.GRAINS,
				totalCents: 12345,
				itemCount: 7
			}
		]);
	});

	it('should hide an aggregate emptied by a deleted purchase', async () => {
		const { sut } = makeSut([
			makeCategorySpend({ category: Receipt.ProductCategory.GRAINS }),
			makeCategorySpend({
				category: Receipt.ProductCategory.SNACKS,
				itemCount: 0,
				totalCents: 0
			})
		]);

		const output = await sut.execute(makeInput());

		expect(output).toHaveLength(1);
		expect(output[0].category).toBe(Receipt.ProductCategory.GRAINS);
	});

	it('should return nothing when the account has no spend in the period', async () => {
		const { sut } = makeSut();

		expect(await sut.execute(makeInput())).toEqual([]);
	});
});
