import { AccountProduct } from '@application/entities/AccountProduct';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListAccountProductsUseCase {
	constructor(
		private readonly accountProductRepository: AccountProductRepository
	) {}

	async execute(
		input: ListAccountProductsUseCase.Input
	): Promise<ListAccountProductsUseCase.Output> {
		const accountProducts = await this.accountProductRepository.listByAccount({
			accountId: input.accountId
		});

		return accountProducts.map((accountProduct) => ({
			accountId: accountProduct.accountId,
			productKey: accountProduct.productKey,
			name: accountProduct.name,
			normalizedName: accountProduct.normalizedName,
			category: accountProduct.category,
			categorySource: accountProduct.categorySource,
			gtin: accountProduct.gtin,
			unit: accountProduct.unit,
			lastUnitPriceCents: accountProduct.lastUnitPriceCents,
			previousUnitPriceCents: accountProduct.previousUnitPriceCents,
			minPriceCents: accountProduct.minPriceCents,
			maxPriceCents: accountProduct.maxPriceCents,
			lastPurchaseAt: accountProduct.lastPurchaseAt,
			lastMerchantId: accountProduct.lastMerchantId,
			purchaseCount: accountProduct.purchaseCount,
			createdAt: accountProduct.createdAt,
			updatedAt: accountProduct.updatedAt
		}));
	}
}

export namespace ListAccountProductsUseCase {
	export type Input = {
		accountId: string;
	};

	export type Output = Omit<AccountProduct, 'lastAppliedPurchaseId'>[];
}
