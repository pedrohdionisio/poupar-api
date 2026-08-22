import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class DeletePurchaseUseCase {
	constructor(private readonly purchaseRepository: PurchaseRepository) {}

	async execute(
		input: DeletePurchaseUseCase.Input
	): Promise<DeletePurchaseUseCase.Output> {
		const purchasedAt = new Date(input.purchasedAt).toISOString();

		const purchase = await this.purchaseRepository.getById({
			accountId: input.accountId,
			purchasedAt,
			id: input.id
		});

		if (!purchase) {
			throw new ResourceNotFound('Purchase not found.');
		}

		await this.purchaseRepository.delete({
			accountId: input.accountId,
			purchasedAt,
			id: input.id
		});
	}
}

export namespace DeletePurchaseUseCase {
	export type Input = {
		accountId: string;
		id: string;
		purchasedAt: string;
	};

	export type Output = void;
}
