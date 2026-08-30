import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class UpdatePurchaseUseCase {
	constructor(
		private readonly purchaseRepository: PurchaseRepository,
		private readonly merchantRepository: MerchantRepository
	) {}

	async execute(
		input: UpdatePurchaseUseCase.Input
	): Promise<UpdatePurchaseUseCase.Output> {
		const purchasedAt = new Date(input.purchasedAt).toISOString();

		const purchase = await this.purchaseRepository.getById({
			accountId: input.accountId,
			purchasedAt,
			id: input.id
		});

		if (!purchase) {
			throw new ResourceNotFound('Purchase not found.');
		}

		const merchant = await this.merchantRepository.getById({
			accountId: input.accountId,
			id: input.merchantId
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		const previousMerchantId = purchase.merchantId;
		const previousTotalCents = purchase.totalCents;

		purchase.merchantId = merchant.id;
		purchase.merchantName = merchant.name;
		purchase.category = merchant.category;
		purchase.totalCents = input.totalCents;
		purchase.discountCents = input.discountCents;
		purchase.itemCount = input.itemCount;
		purchase.updatedAt = new Date();

		await this.purchaseRepository.update({ purchase });

		if (previousMerchantId === purchase.merchantId) {
			await this.merchantRepository.adjustTotals({
				accountId: input.accountId,
				merchantId: purchase.merchantId,
				purchaseCountDelta: 0,
				totalCentsDelta: purchase.totalCents - previousTotalCents
			});

			return;
		}

		await this.merchantRepository.adjustTotals({
			accountId: input.accountId,
			merchantId: previousMerchantId,
			purchaseCountDelta: -1,
			totalCentsDelta: -previousTotalCents
		});

		await this.merchantRepository.applyPurchase({
			accountId: input.accountId,
			merchantId: purchase.merchantId,
			purchaseId: purchase.id,
			totalCents: purchase.totalCents,
			purchasedAt: purchase.purchasedAt
		});
	}
}

export namespace UpdatePurchaseUseCase {
	export type Input = {
		accountId: string;
		id: string;
		purchasedAt: string;
		merchantId: string;
		totalCents: number;
		discountCents: number;
		itemCount: number;
	};

	export type Output = void;
}
