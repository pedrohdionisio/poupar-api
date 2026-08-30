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
		const merchant = await this.merchantRepository.getById({
			accountId: input.accountId,
			id: input.id
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		merchant.name = input.name;
		merchant.category = input.category;
		merchant.cnpj = input.cnpj;
		merchant.updatedAt = new Date();

		await this.merchantRepository.update({ merchant });
	}
}

export namespace UpdateMerchantUseCase {
	export type Input = {
		accountId: string;
		id: string;
		name: string;
		category: Merchant.Category;
		cnpj: string | null;
	};

	export type Output = void;
}
