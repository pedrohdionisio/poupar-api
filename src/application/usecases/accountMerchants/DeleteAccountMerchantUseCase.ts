import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountMerchantRepository } from '@infra/database/dynamo/repositories/AccountMerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class DeleteAccountMerchantUseCase {
	constructor(
		private readonly accountMerchantRepository: AccountMerchantRepository
	) {}

	async execute(
		input: DeleteAccountMerchantUseCase.Input
	): Promise<DeleteAccountMerchantUseCase.Output> {
		const accountMerchant = await this.accountMerchantRepository.getByCnpj({
			accountId: input.accountId,
			cnpj: input.cnpj
		});

		if (!accountMerchant) {
			throw new ResourceNotFound('Account merchant not found.');
		}

		await this.accountMerchantRepository.delete({
			accountId: input.accountId,
			cnpj: input.cnpj
		});
	}
}

export namespace DeleteAccountMerchantUseCase {
	export type Input = {
		accountId: string;
		cnpj: string;
	};

	export type Output = void;
}
