import { Merchant } from '@application/entities/Merchant';
import { PricePoint } from '@application/entities/PricePoint';
import { Purchase } from '@application/entities/Purchase';
import { PurchaseDedupe } from '@application/entities/PurchaseDedupe';
import { Receipt } from '@application/entities/Receipt';
import { ReceiptAlreadyImported } from '@application/errors/application/ReceiptAlreadyImported';
import { ResourceAlreadyExists } from '@application/errors/application/ResourceAlreadyExists';
import { ImportPurchaseNormalizer } from '@application/normalizers/ImportPurchaseNormalizer';
import { AccountMerchantRepository } from '@infra/database/dynamo/repositories/AccountMerchantRepository';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { PricePointRepository } from '@infra/database/dynamo/repositories/PricePointRepository';
import { PurchaseDedupeRepository } from '@infra/database/dynamo/repositories/PurchaseDedupeRepository';
import { PurchaseTransactionRepository } from '@infra/database/dynamo/repositories/PurchaseTransactionRepository';
import { Injectable } from '@kernel/decorators/Injectable';
import { mapInBatches } from '@shared/utils/mapInBatches';

const PROJECTION_BATCH_SIZE = 10;

@Injectable()
export class ImportPurchaseUseCase {
	constructor(
		private readonly merchantRepository: MerchantRepository,
		private readonly purchaseTransactionRepository: PurchaseTransactionRepository,
		private readonly purchaseDedupeRepository: PurchaseDedupeRepository,
		private readonly accountMerchantRepository: AccountMerchantRepository,
		private readonly accountProductRepository: AccountProductRepository,
		private readonly pricePointRepository: PricePointRepository
	) {}

	async execute(
		input: ImportPurchaseUseCase.Input
	): Promise<ImportPurchaseUseCase.Output> {
		const { items, itemCount } = ImportPurchaseNormalizer.normalize({
			merchantCnpj: input.merchant.cnpj,
			items: input.items
		});

		const merchant = await this.ensureMerchant({ merchant: input.merchant });

		const purchase = new Purchase({
			accountId: input.accountId,
			purchasedAt: new Date(input.purchasedAt),
			merchantCnpj: merchant.cnpj,
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
					merchantCnpj: merchant.cnpj,
					merchantName: merchant.name,
					category: merchant.category,
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
			merchantCnpj: purchase.merchantCnpj,
			merchantName: purchase.merchantName,
			category: purchase.category,
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

	private async applyProjections({
		accountId,
		purchaseId,
		purchasedAt,
		merchantCnpj,
		merchantName,
		category,
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
					merchantCnpj,
					unitPriceCents: item.unitPriceCents,
					quantityMilli: item.quantityMilli,
					unit: item.unit
				})
		);

		await Promise.all([
			this.accountMerchantRepository.applyPurchase({
				accountId,
				cnpj: merchantCnpj,
				name: merchantName,
				category,
				purchaseId,
				totalCents,
				purchasedAt
			}),
			this.pricePointRepository.createMany({ pricePoints }),
			mapInBatches({
				items,
				size: PROJECTION_BATCH_SIZE,
				handler: (item) =>
					this.accountProductRepository.applyPurchaseItem({
						accountId,
						productKey: item.productKey,
						name: item.description,
						normalizedName: item.normalizedName,
						gtin: item.gtin,
						unit: item.unit,
						merchantCnpj,
						unitPriceCents: item.unitPriceCents,
						purchaseId,
						purchasedAt
					})
			})
		]);
	}

	private async ensureMerchant({
		merchant
	}: ImportPurchaseUseCase.EnsureMerchantParams): Promise<Merchant> {
		const existing = await this.merchantRepository.getByCnpj({
			cnpj: merchant.cnpj
		});

		if (existing) {
			return existing;
		}

		const created = new Merchant({
			cnpj: merchant.cnpj,
			name: merchant.name,
			fantasyName: merchant.fantasyName,
			category: Merchant.Category.SUPERMARKET,
			address: merchant.address
		});

		try {
			await this.merchantRepository.create({ merchant: created });

			return created;
		} catch (error) {
			if (!(error instanceof ResourceAlreadyExists)) {
				throw error;
			}

			const winner = await this.merchantRepository.getByCnpj({
				cnpj: merchant.cnpj
			});

			return winner ?? created;
		}
	}
}

export namespace ImportPurchaseUseCase {
	export type MerchantInput = {
		cnpj: string;
		name: string;
		fantasyName: string | null;
		address: string;
	};

	export type Input = {
		accountId: string;
		source: Purchase.Source;
		purchasedAt: string;
		accessKey: string | null;
		photoS3Key: string | null;
		ocrS3Key: string | null;
		merchant: MerchantInput;
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

	export type EnsureMerchantParams = {
		merchant: MerchantInput;
	};

	export type ApplyProjectionsParams = {
		accountId: string;
		purchaseId: string;
		purchasedAt: Date;
		merchantCnpj: string;
		merchantName: string;
		category: Merchant.Category;
		totalCents: number;
		items: Receipt.Item[];
	};
}
