import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PricePointRepository } from '@infra/database/dynamo/repositories/PricePointRepository';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { PurchaseTransactionRepository } from '@infra/database/dynamo/repositories/PurchaseTransactionRepository';
import { ReceiptRepository } from '@infra/database/dynamo/repositories/ReceiptRepository';
import { Injectable } from '@kernel/decorators/Injectable';
import { mapInBatches } from '@shared/utils/mapInBatches';

const REBUILD_BATCH_SIZE = 10;

@Injectable()
export class DeletePurchaseUseCase {
	constructor(
		private readonly purchaseRepository: PurchaseRepository,
		private readonly receiptRepository: ReceiptRepository,
		private readonly pricePointRepository: PricePointRepository,
		private readonly accountProductRepository: AccountProductRepository,
		private readonly merchantRepository: MerchantRepository,
		private readonly purchaseTransactionRepository: PurchaseTransactionRepository
	) {}

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

		const receipt = await this.receiptRepository.getByPurchaseId({
			accountId: input.accountId,
			purchaseId: purchase.id
		});

		const productKeys = [
			...new Set((receipt?.items ?? []).map((item) => item.productKey))
		];

		await this.pricePointRepository.deleteMany({
			accountId: input.accountId,
			productKeys,
			purchasedAt: purchase.purchasedAt,
			purchaseId: purchase.id
		});

		await mapInBatches({
			items: productKeys,
			size: REBUILD_BATCH_SIZE,
			handler: (productKey) =>
				this.rebuildAccountProduct({ accountId: input.accountId, productKey })
		});

		const merchant = await this.merchantRepository.getById({
			accountId: input.accountId,
			id: purchase.merchantId
		});

		await this.purchaseTransactionRepository.deleteCascade({
			purchase,
			revertMerchant: Boolean(merchant)
		});
	}

	private async rebuildAccountProduct({
		accountId,
		productKey
	}: DeletePurchaseUseCase.RebuildAccountProductParams): Promise<void> {
		const series = await this.pricePointRepository.listByProduct({
			accountId,
			productKey
		});

		if (series.length === 0) {
			await this.accountProductRepository.delete({ accountId, productKey });

			return;
		}

		const last = series[series.length - 1];
		const previous = series.length > 1 ? series[series.length - 2] : null;
		const unitPrices = series.map((pricePoint) => pricePoint.unitPriceCents);

		await this.accountProductRepository.rebuildFromSeries({
			accountId,
			productKey,
			purchaseCount: series.length,
			minPriceCents: Math.min(...unitPrices),
			maxPriceCents: Math.max(...unitPrices),
			lastUnitPriceCents: last.unitPriceCents,
			previousUnitPriceCents: previous?.unitPriceCents ?? null,
			lastPurchaseAt: last.purchasedAt,
			lastMerchantId: last.merchantId,
			unit: last.unit,
			lastAppliedPurchaseId: last.purchaseId
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

	export type RebuildAccountProductParams = {
		accountId: string;
		productKey: string;
	};
}
