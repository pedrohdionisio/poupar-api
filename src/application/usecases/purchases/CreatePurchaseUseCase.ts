import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class CreatePurchaseUseCase {
	constructor(
		private readonly purchaseRepository: PurchaseRepository,
		private readonly merchantRepository: MerchantRepository
	) {}

	async execute(
		input: CreatePurchaseUseCase.Input
	): Promise<CreatePurchaseUseCase.Output> {
		const merchant = await this.merchantRepository.getByCnpj({
			cnpj: input.merchantCnpj
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		const purchase = new Purchase({
			accountId: input.accountId,
			purchasedAt: new Date(input.purchasedAt),
			merchantCnpj: input.merchantCnpj,
			merchantName: input.merchantName,
			category: input.category,
			totalCents: input.totalCents,
			discountCents: input.discountCents,
			itemCount: input.itemCount,
			accessKey: input.accessKey,
			source: input.source
		});

		await this.purchaseRepository.create({ purchase });

		return {
			id: purchase.id,
			purchasedAt: purchase.purchasedAt
		};
	}
}

export namespace CreatePurchaseUseCase {
	export type Input = {
		accountId: string;
		purchasedAt: string;
		merchantCnpj: string;
		merchantName: string;
		category: Merchant.Category;
		totalCents: number;
		discountCents: number;
		itemCount: number;
		accessKey: string | null;
		source: Purchase.Source;
	};

	export type Output = {
		id: string;
		purchasedAt: Date;
	};
}
