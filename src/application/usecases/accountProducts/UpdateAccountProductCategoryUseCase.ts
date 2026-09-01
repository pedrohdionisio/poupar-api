import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class UpdateAccountProductCategoryUseCase {
	constructor(
		private readonly accountProductRepository: AccountProductRepository
	) {}

	async execute(
		input: UpdateAccountProductCategoryUseCase.Input
	): Promise<UpdateAccountProductCategoryUseCase.Output> {
		const updated = await this.accountProductRepository.updateCategory({
			accountId: input.accountId,
			productKey: input.productKey,
			category: input.category,
			categorySource: AccountProduct.CategorySource.USER
		});

		if (!updated) {
			throw new ResourceNotFound(`Product "${input.productKey}" not found.`);
		}
	}
}

export namespace UpdateAccountProductCategoryUseCase {
	export type Input = {
		accountId: string;
		productKey: string;
		category: Receipt.ProductCategory;
	};

	export type Output = void;
}
