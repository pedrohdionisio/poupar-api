import { Receipt } from '@application/entities/Receipt';
import { CategorySpendRepository } from '@infra/database/dynamo/repositories/CategorySpendRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListCategorySpendsUseCase {
	constructor(
		private readonly categorySpendRepository: CategorySpendRepository
	) {}

	async execute(
		input: ListCategorySpendsUseCase.Input
	): Promise<ListCategorySpendsUseCase.Output> {
		const categorySpends = await this.categorySpendRepository.listByPeriod({
			accountId: input.accountId,
			from: input.from,
			to: input.to
		});

		return categorySpends
			.filter((categorySpend) => categorySpend.itemCount > 0)
			.map((categorySpend) => ({
				month: categorySpend.month,
				category: categorySpend.category,
				totalCents: categorySpend.totalCents,
				itemCount: categorySpend.itemCount
			}));
	}
}

export namespace ListCategorySpendsUseCase {
	export type Input = {
		accountId: string;
		from: string;
		to: string;
	};

	export type Output = {
		month: string;
		category: Receipt.ProductCategory;
		totalCents: number;
		itemCount: number;
	}[];
}
