import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { Conflict } from '@application/errors/http/Conflict';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class DeleteMerchantUseCase {
	constructor(private readonly merchantRepository: MerchantRepository) {}

	async execute({
		accountId,
		id
	}: DeleteMerchantUseCase.Input): Promise<DeleteMerchantUseCase.Output> {
		const merchant = await this.merchantRepository.getById({ accountId, id });

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		if (merchant.purchaseCount > 0) {
			throw new Conflict(
				`Merchant "${id}" has ${merchant.purchaseCount} purchases and cannot be deleted.`
			);
		}

		await this.merchantRepository.delete({ accountId, id });
	}
}

export namespace DeleteMerchantUseCase {
	export type Input = {
		accountId: string;
		id: string;
	};

	export type Output = void;
}
