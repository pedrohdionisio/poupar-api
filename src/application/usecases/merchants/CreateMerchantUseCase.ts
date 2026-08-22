import { Merchant } from '@application/entities/Merchant';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class CreateMerchantUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute(
		input: CreateMerchantUseCase.Input
	): Promise<CreateMerchantUseCase.Output> {
		const merchant = new Merchant(input);

		await this.merchantRepository.create({ merchant });

		return { cnpj: merchant.cnpj };
	}
}

export namespace CreateMerchantUseCase {
	export type Input = {
		cnpj: string;
		name: string;
		fantasyName: string | null;
		category: Merchant.Category;
		address: string;
	};

	export type Output = {
		cnpj: string;
	};
}
