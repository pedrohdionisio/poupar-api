import { Merchant } from '@application/entities/Merchant';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class UpdateMerchantUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute(
		input: UpdateMerchantUseCase.Input
	): Promise<UpdateMerchantUseCase.Output> {
		const merchant = await this.merchantRepository.getByCnpj({
			cnpj: input.cnpj
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		merchant.name = input.name;
		merchant.fantasyName = input.fantasyName;
		merchant.category = input.category;
		merchant.address = input.address;
		merchant.updatedAt = new Date();

		await this.merchantRepository.update({ merchant });
	}
}

export namespace UpdateMerchantUseCase {
	export type Input = {
		cnpj: string;
		name: string;
		fantasyName: string | null;
		category: Merchant.Category;
		address: string;
	};

	export type Output = void;
}
