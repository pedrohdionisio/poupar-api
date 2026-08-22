import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountMerchantRepository } from '@infra/database/dynamo/repositories/AccountMerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class UpdateAccountMerchantUseCase {
	constructor(
		private readonly accountMerchantRepository: AccountMerchantRepository
	) {}

	async execute(
		input: UpdateAccountMerchantUseCase.Input
	): Promise<UpdateAccountMerchantUseCase.Output> {
		const accountMerchant = await this.accountMerchantRepository.getByCnpj({
			accountId: input.accountId,
			cnpj: input.cnpj
		});

		if (!accountMerchant) {
			throw new ResourceNotFound('Account merchant not found.');
		}

		await this.accountMerchantRepository.updateAlias({
			accountId: input.accountId,
			cnpj: input.cnpj,
			alias: input.alias
		});
	}
}

export namespace UpdateAccountMerchantUseCase {
	export type Input = {
		accountId: string;
		cnpj: string;
		alias: string | null;
	};

	export type Output = void;
}
