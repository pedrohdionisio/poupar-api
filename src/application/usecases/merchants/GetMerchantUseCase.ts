import { Merchant } from '@application/entities/Merchant';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class GetMerchantUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute(
		input: GetMerchantUseCase.Input
	): Promise<GetMerchantUseCase.Output> {
		const merchant = await this.merchantRepository.getByCnpj({
			cnpj: input.cnpj
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		return merchant;
	}
}

export namespace GetMerchantUseCase {
	export type Input = {
		cnpj: string;
	};

	export type Output = Merchant;
}
