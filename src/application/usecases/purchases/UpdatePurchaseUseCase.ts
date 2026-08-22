import { Merchant } from '@application/entities/Merchant';
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

		const merchant = await this.merchantRepository.getByCnpj({
			cnpj: input.merchantCnpj
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		purchase.merchantCnpj = input.merchantCnpj;
		purchase.merchantName = input.merchantName;
		purchase.category = input.category;
		purchase.totalCents = input.totalCents;
		purchase.discountCents = input.discountCents;
		purchase.itemCount = input.itemCount;
		purchase.updatedAt = new Date();

		await this.purchaseRepository.update({ purchase });
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
