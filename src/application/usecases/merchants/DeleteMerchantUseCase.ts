import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class DeleteMerchantUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute({
		cnpj
	}: DeleteMerchantUseCase.Input): Promise<DeleteMerchantUseCase.Output> {
		const merchant = await this.merchantRepository.getByCnpj({ cnpj });

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		await this.merchantRepository.delete({ cnpj });
	}
}

export namespace DeleteMerchantUseCase {
	export type Input = {
		cnpj: string;
	};

	export type Output = void;
}
