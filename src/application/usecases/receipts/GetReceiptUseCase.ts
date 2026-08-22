import { Receipt } from '@application/entities/Receipt';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ReceiptRepository } from '@infra/database/dynamo/repositories/ReceiptRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class GetReceiptUseCase {
	constructor(private readonly receiptRepository: ReceiptRepository) {}

	async execute(
		input: GetReceiptUseCase.Input
	): Promise<GetReceiptUseCase.Output> {
		const receipt = await this.receiptRepository.getByPurchaseId({
			accountId: input.accountId,
			purchaseId: input.purchaseId
		});

		if (!receipt) {
			throw new ResourceNotFound('Receipt not found.');
		}

		return receipt;
	}
}

export namespace GetReceiptUseCase {
	export type Input = {
		accountId: string;
		purchaseId: string;
	};

	export type Output = Receipt;
}
