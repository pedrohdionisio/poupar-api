import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';

export class AccountProductItem {
	static readonly type = 'AccountProduct';
	private readonly keys: AccountProductItem.Keys;

	constructor(private readonly attr: AccountProductItem.Attributes) {
		this.keys = {
			PK: AccountProductItem.getPK({ accountId: this.attr.accountId }),
			SK: AccountProductItem.getSK({ productKey: this.attr.productKey })
		};
	}

	toItem(): AccountProductItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: AccountProductItem.type
		};
	}

	static fromEntity({ entity }: AccountProductItem.FromEntityParams) {
		return new AccountProductItem({
			accountId: entity.accountId,
			productKey: entity.productKey,
			name: entity.name,
			normalizedName: entity.normalizedName,
			gtin: entity.gtin,
			unit: entity.unit,
			lastUnitPriceCents: entity.lastUnitPriceCents,
			previousUnitPriceCents: entity.previousUnitPriceCents,
			minPriceCents: entity.minPriceCents,
			maxPriceCents: entity.maxPriceCents,
			lastPurchaseAt: entity.lastPurchaseAt.toISOString(),
			lastMerchantCnpj: entity.lastMerchantCnpj,
			purchaseCount: entity.purchaseCount,
			lastAppliedPurchaseId: entity.lastAppliedPurchaseId,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: AccountProductItem.ToEntityParams) {
		return new AccountProduct({
			accountId: item.accountId,
			productKey: item.productKey,
			name: item.name,
			normalizedName: item.normalizedName,
			gtin: item.gtin,
			unit: item.unit,
			lastUnitPriceCents: item.lastUnitPriceCents,
			previousUnitPriceCents: item.previousUnitPriceCents,
			minPriceCents: item.minPriceCents,
			maxPriceCents: item.maxPriceCents,
			lastPurchaseAt: new Date(item.lastPurchaseAt),
			lastMerchantCnpj: item.lastMerchantCnpj,
			purchaseCount: item.purchaseCount,
			lastAppliedPurchaseId: item.lastAppliedPurchaseId,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({
		accountId
	}: AccountProductItem.GetPKParams): AccountProductItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({
		productKey
	}: AccountProductItem.GetSKParams): AccountProductItem['keys']['SK'] {
		return `PRODUCT#${productKey}`;
	}

	static getSKPrefix(): 'PRODUCT#' {
		return 'PRODUCT#';
	}
}

export namespace AccountProductItem {
	export type FromEntityParams = {
		entity: AccountProduct;
	};

	export type ToEntityParams = {
		item: AccountProductItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `PRODUCT#${string}`;
	};

	export type Attributes = {
		accountId: string;
		productKey: string;
		name: string;
		normalizedName: string;
		gtin: string | null;
		unit: Receipt.Unit;
		lastUnitPriceCents: number;
		previousUnitPriceCents: number | null;
		minPriceCents: number;
		maxPriceCents: number;
		lastPurchaseAt: string;
		lastMerchantCnpj: string;
		purchaseCount: number;
		lastAppliedPurchaseId: string;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'AccountProduct';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		productKey: string;
	};
}
