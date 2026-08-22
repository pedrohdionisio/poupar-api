import { Merchant } from '@application/entities/Merchant';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListMerchantsUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute(): Promise<ListMerchantsUseCase.Output> {
		const merchants = await this.merchantRepository.list();

		return merchants;
	}
}

export namespace ListMerchantsUseCase {
	export type Output = Merchant[];
}
