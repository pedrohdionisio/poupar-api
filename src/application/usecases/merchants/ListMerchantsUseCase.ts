import { Merchant } from '@application/entities/Merchant';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListMerchantsUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute(
		input: ListMerchantsUseCase.Input
	): Promise<ListMerchantsUseCase.Output> {
		return this.merchantRepository.listByAccount({
			accountId: input.accountId
		});
	}
}

export namespace ListMerchantsUseCase {
	export type Input = {
		accountId: string;
	};

	export type Output = Merchant[];
}
