import { CategorySpend } from '@application/entities/CategorySpend';
import { Merchant } from '@application/entities/Merchant';
import { PricePoint } from '@application/entities/PricePoint';
import { Purchase } from '@application/entities/Purchase';
import { PurchaseDedupe } from '@application/entities/PurchaseDedupe';
import { Receipt } from '@application/entities/Receipt';
import { ReceiptAlreadyImported } from '@application/errors/application/ReceiptAlreadyImported';
import { ResourceAlreadyExists } from '@application/errors/application/ResourceAlreadyExists';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ImportPurchaseNormalizer } from '@application/normalizers/ImportPurchaseNormalizer';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { CategorySpendRepository } from '@infra/database/dynamo/repositories/CategorySpendRepository';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PricePointRepository } from '@infra/database/dynamo/repositories/PricePointRepository';
import { PurchaseDedupeRepository } from '@infra/database/dynamo/repositories/PurchaseDedupeRepository';
import { PurchaseTransactionRepository } from '@infra/database/dynamo/repositories/PurchaseTransactionRepository';
import { Injectable } from '@kernel/decorators/Injectable';
import { getBrazilMonth } from '@shared/utils/getBrazilMonth';
import { mapInBatches } from '@shared/utils/mapInBatches';

const PROJECTION_BATCH_SIZE = 10;

@Injectable()
export class ImportPurchaseUseCase {
	constructor(
		private readonly merchantRepository: MerchantRepository,
		private readonly purchaseTransactionRepository: PurchaseTransactionRepository,
		private readonly purchaseDedupeRepository: PurchaseDedupeRepository,
		private readonly accountProductRepository: AccountProductRepository,
		private readonly pricePointRepository: PricePointRepository,
		private readonly categorySpendRepository: CategorySpendRepository
	) {}

	async execute(
		input: ImportPurchaseUseCase.Input
	): Promise<ImportPurchaseUseCase.Output> {
		const normalized = ImportPurchaseNormalizer.normalize({
			items: input.items
		});
		const itemCount = normalized.itemCount;

		const items = await this.resolveCategories({
			accountId: input.accountId,
			items: normalized.items
		});

		const merchant = await this.loadMerchant({
			accountId: input.accountId,
			merchantId: input.merchantId
		});

		const purchase = new Purchase({
			accountId: input.accountId,
			purchasedAt: new Date(input.purchasedAt),
			merchantId: merchant.id,
			merchantName: merchant.name,
			category: merchant.category,
			totalCents: input.totalCents,
			discountCents: input.discountCents,
			itemCount,
			accessKey: input.accessKey,
			source: input.source
		});

		const receipt = new Receipt({
			purchaseId: purchase.id,
			accountId: input.accountId,
			accessKey: input.accessKey,
			photoS3Key: input.photoS3Key,
			ocrS3Key: input.ocrS3Key,
			items
		});

		const purchaseDedupe = input.accessKey
			? new PurchaseDedupe({
					accountId: input.accountId,
					accessKey: input.accessKey,
					purchaseId: purchase.id
				})
			: null;

		try {
			await this.purchaseTransactionRepository.create({
				purchase,
				receipt,
				purchaseDedupe
			});
		} catch (error) {
			if (!(error instanceof ResourceAlreadyExists) || !input.accessKey) {
				throw error;
			}

			const imported = await this.purchaseDedupeRepository.getByAccessKey({
				accountId: input.accountId,
				accessKey: input.accessKey
			});

			if (imported) {
				await this.applyProjections({
					accountId: input.accountId,
					purchaseId: imported.purchaseId,
					purchasedAt: purchase.purchasedAt,
					merchantId: merchant.id,
					totalCents: purchase.totalCents,
					items
				});
			}

			throw new ReceiptAlreadyImported(imported?.purchaseId ?? null);
		}

		await this.applyProjections({
			accountId: input.accountId,
			purchaseId: purchase.id,
			purchasedAt: purchase.purchasedAt,
			merchantId: purchase.merchantId,
			totalCents: purchase.totalCents,
			items
		});

		return {
			purchaseId: purchase.id,
			purchasedAt: purchase.purchasedAt,
			itemCount: purchase.itemCount,
			totalCents: purchase.totalCents
		};
	}

	private async resolveCategories({
		accountId,
		items
	}: ImportPurchaseUseCase.ResolveCategoriesParams): Promise<Receipt.Item[]> {
		const known = await this.accountProductRepository.getByProductKeys({
			accountId,
			productKeys: items.map((item) => item.productKey)
		});

		const categories = new Map(
			known.map((accountProduct) => [
				accountProduct.productKey,
				accountProduct.category
			])
		);

		return items.map((item) => ({
			...item,
			category: categories.get(item.productKey) ?? item.category
		}));
	}

	private async applyProjections({
		accountId,
		purchaseId,
		purchasedAt,
		merchantId,
		totalCents,
		items
	}: ImportPurchaseUseCase.ApplyProjectionsParams): Promise<void> {
		const pricePoints = items.map(
			(item) =>
				new PricePoint({
					accountId,
					productKey: item.productKey,
					purchaseId,
					purchasedAt,
					merchantId,
					unitPriceCents: item.unitPriceCents,
					quantityMilli: item.quantityMilli,
					unit: item.unit
				})
		);

		await Promise.all([
			this.merchantRepository.applyPurchase({
				accountId,
				merchantId,
				purchaseId,
				totalCents,
				purchasedAt
			}),
			this.categorySpendRepository.applyPurchase({
				accountId,
				purchaseId,
				month: getBrazilMonth({ date: purchasedAt }),
				entries: CategorySpend.toEntries({ items })
			}),
			this.pricePointRepository.createMany({ pricePoints }),
			mapInBatches({
				items,
				size: PROJECTION_BATCH_SIZE,
				handler: (item) =>
					this.accountProductRepository.applyPurchaseItem({
						accountId,
						productKey: item.productKey,
						name: item.displayName,
						normalizedName: item.normalizedName,
						category: item.category,
						gtin: item.gtin,
						unit: item.unit,
						merchantId,
						unitPriceCents: item.unitPriceCents,
						purchaseId,
						purchasedAt
					})
			})
		]);
	}

	private async loadMerchant({
		accountId,
		merchantId
	}: ImportPurchaseUseCase.LoadMerchantParams): Promise<Merchant> {
		const merchant = await this.merchantRepository.getById({
			accountId,
			id: merchantId
		});

		if (!merchant) {
			throw new ResourceNotFound(`Merchant "${merchantId}" not found.`);
		}

		return merchant;
	}
}

export namespace ImportPurchaseUseCase {
	export type Input = {
		accountId: string;
		source: Purchase.Source;
		purchasedAt: string;
		accessKey: string | null;
		photoS3Key: string | null;
		ocrS3Key: string | null;
		merchantId: string;
		totalCents: number;
		discountCents: number;
		items: ImportPurchaseNormalizer.PayloadItem[];
	};

	export type Output = {
		purchaseId: string;
		purchasedAt: Date;
		itemCount: number;
		totalCents: number;
	};

	export type ResolveCategoriesParams = {
		accountId: string;
		items: Receipt.Item[];
	};

	export type LoadMerchantParams = {
		accountId: string;
		merchantId: string;
	};

	export type ApplyProjectionsParams = {
		accountId: string;
		purchaseId: string;
		purchasedAt: Date;
		merchantId: string;
		totalCents: number;
		items: Receipt.Item[];
	};
}
