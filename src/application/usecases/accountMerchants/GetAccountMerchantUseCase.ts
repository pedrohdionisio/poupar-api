import { AccountMerchant } from '@application/entities/AccountMerchant';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountMerchantRepository } from '@infra/database/dynamo/repositories/AccountMerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class GetAccountMerchantUseCase {
	constructor(
		private readonly accountMerchantRepository: AccountMerchantRepository
	) {}

	async execute(
		input: GetAccountMerchantUseCase.Input
	): Promise<GetAccountMerchantUseCase.Output> {
		const accountMerchant = await this.accountMerchantRepository.getByCnpj({
			accountId: input.accountId,
			cnpj: input.cnpj
		});

		if (!accountMerchant) {
			throw new ResourceNotFound('Account merchant not found.');
		}

		return {
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
		};
	}
}

export namespace GetAccountMerchantUseCase {
	export type Input = {
		accountId: string;
		cnpj: string;
	};

	export type Output = Omit<AccountMerchant, 'lastAppliedPurchaseId'>;
}
