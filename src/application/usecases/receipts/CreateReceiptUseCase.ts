import { Receipt } from '@application/entities/Receipt';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { ReceiptRepository } from '@infra/database/dynamo/repositories/ReceiptRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class CreateReceiptUseCase {
	constructor(
		private readonly receiptRepository: ReceiptRepository,
		private readonly purchaseRepository: PurchaseRepository
	) {}

	async execute(
		input: CreateReceiptUseCase.Input
	): Promise<CreateReceiptUseCase.Output> {
		const purchase = await this.purchaseRepository.getById({
			accountId: input.accountId,
			purchasedAt: new Date(input.purchasedAt).toISOString(),
			id: input.purchaseId
		});

		if (!purchase) {
			throw new ResourceNotFound('Purchase not found.');
		}

		const receipt = new Receipt({
			purchaseId: input.purchaseId,
			accountId: input.accountId,
			accessKey: input.accessKey,
			photoS3Key: input.photoS3Key,
			ocrS3Key: input.ocrS3Key,
			items: input.items
		});

		await this.receiptRepository.create({ receipt });

		return {
			purchaseId: receipt.purchaseId
		};
	}
}

export namespace CreateReceiptUseCase {
	export type Input = {
		accountId: string;
		purchaseId: string;
		purchasedAt: string;
		accessKey: string | null;
		photoS3Key: string;
		ocrS3Key: string | null;
		items: Receipt.Item[];
	};

	export type Output = {
		purchaseId: string;
	};
}
