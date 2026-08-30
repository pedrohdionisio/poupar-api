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

		return { id: merchant.id };
	}
}

export namespace CreateMerchantUseCase {
	export type Input = {
		accountId: string;
		name: string;
		category: Merchant.Category;
		cnpj: string | null;
	};

	export type Output = {
		id: string;
	};
}
