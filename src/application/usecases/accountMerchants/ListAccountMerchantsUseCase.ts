import { AccountMerchant } from '@application/entities/AccountMerchant';
import { AccountMerchantRepository } from '@infra/database/dynamo/repositories/AccountMerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListAccountMerchantsUseCase {
	constructor(
		private readonly accountMerchantRepository: AccountMerchantRepository
	) {}

	async execute(
		input: ListAccountMerchantsUseCase.Input
	): Promise<ListAccountMerchantsUseCase.Output> {
		const accountMerchants = await this.accountMerchantRepository.listByAccount(
			{
				accountId: input.accountId
			}
		);

		return accountMerchants.map((accountMerchant) => ({
			accountId: accountMerchant.accountId,
			merchantCnpj: accountMerchant.merchantCnpj,
			alias: accountMerchant.alias,
			name: accountMerchant.name,
			category: accountMerchant.category,
			purchaseCount: accountMerchant.purchaseCount,
			totalSpentCents: accountMerchant.totalSpentCents,
			firstPurchaseAt: accountMerchant.firstPurchaseAt,
			lastPurchaseAt: accountMerchant.lastPurchaseAt,
			createdAt: accountMerchant.createdAt,
			updatedAt: accountMerchant.updatedAt
		}));
	}
}

export namespace ListAccountMerchantsUseCase {
	export type Input = {
		accountId: string;
	};

	export type Output = Omit<AccountMerchant, 'lastAppliedPurchaseId'>[];
}
