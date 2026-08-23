import { Merchant } from '@application/entities/Merchant';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountMerchantRepository } from '@infra/database/dynamo/repositories/AccountMerchantRepository';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class UpdatePurchaseUseCase {
	constructor(
		private readonly purchaseRepository: PurchaseRepository,
		private readonly merchantRepository: MerchantRepository,
		private readonly accountMerchantRepository: AccountMerchantRepository
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

		const merchant = await this.merchantRepository.getByCnpj({
			cnpj: input.merchantCnpj
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		const previousCnpj = purchase.merchantCnpj;
		const previousTotalCents = purchase.totalCents;

		purchase.merchantCnpj = input.merchantCnpj;
		purchase.merchantName = input.merchantName;
		purchase.category = input.category;
		purchase.totalCents = input.totalCents;
		purchase.discountCents = input.discountCents;
		purchase.itemCount = input.itemCount;
		purchase.updatedAt = new Date();

		await this.purchaseRepository.update({ purchase });

		if (previousCnpj === purchase.merchantCnpj) {
			await this.accountMerchantRepository.adjustTotals({
				accountId: input.accountId,
				cnpj: purchase.merchantCnpj,
				purchaseCountDelta: 0,
				totalCentsDelta: purchase.totalCents - previousTotalCents
			});

			return;
		}

		await this.accountMerchantRepository.adjustTotals({
			accountId: input.accountId,
			cnpj: previousCnpj,
			purchaseCountDelta: -1,
			totalCentsDelta: -previousTotalCents
		});

		await this.accountMerchantRepository.deleteIfEmpty({
			accountId: input.accountId,
			cnpj: previousCnpj
		});

		await this.accountMerchantRepository.applyPurchase({
			accountId: input.accountId,
			cnpj: purchase.merchantCnpj,
			name: purchase.merchantName,
			category: purchase.category,
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
		merchantCnpj: string;
		merchantName: string;
		category: Merchant.Category;
		totalCents: number;
		discountCents: number;
		itemCount: number;
	};

	export type Output = void;
}
