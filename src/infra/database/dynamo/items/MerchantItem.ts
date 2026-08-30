import { Merchant } from '@application/entities/Merchant';

export class MerchantItem {
	static readonly type = 'Merchant';
	private readonly keys: MerchantItem.Keys;

	constructor(private readonly attr: MerchantItem.Attributes) {
		this.keys = {
			PK: MerchantItem.getPK({ accountId: this.attr.accountId }),
			SK: MerchantItem.getSK({ id: this.attr.id })
		};
	}

	toItem(): MerchantItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: MerchantItem.type
		};
	}

	static fromEntity({ entity }: MerchantItem.FromEntityParams) {
		return new MerchantItem({
			id: entity.id,
			accountId: entity.accountId,
			name: entity.name,
			category: entity.category,
			cnpj: entity.cnpj,
			purchaseCount: entity.purchaseCount,
			totalSpentCents: entity.totalSpentCents,
			firstPurchaseAt: entity.firstPurchaseAt?.toISOString() ?? null,
			lastPurchaseAt: entity.lastPurchaseAt?.toISOString() ?? null,
			lastAppliedPurchaseId: entity.lastAppliedPurchaseId,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: MerchantItem.ToEntityParams) {
		return new Merchant({
			id: item.id,
			accountId: item.accountId,
			name: item.name,
			category: item.category,
			cnpj: item.cnpj,
			purchaseCount: item.purchaseCount,
			totalSpentCents: item.totalSpentCents,
			firstPurchaseAt: item.firstPurchaseAt
				? new Date(item.firstPurchaseAt)
				: null,
			lastPurchaseAt: item.lastPurchaseAt
				? new Date(item.lastPurchaseAt)
				: null,
			lastAppliedPurchaseId: item.lastAppliedPurchaseId,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({
		accountId
	}: MerchantItem.GetPKParams): MerchantItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({ id }: MerchantItem.GetSKParams): MerchantItem['keys']['SK'] {
		return `MERCHANT#${id}`;
	}

	static getSKPrefix(): 'MERCHANT#' {
		return 'MERCHANT#';
	}
}

export namespace MerchantItem {
	export type FromEntityParams = {
		entity: Merchant;
	};

	export type ToEntityParams = {
		item: MerchantItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `MERCHANT#${string}`;
	};

	export type Attributes = {
		id: string;
		accountId: string;
		name: string;
		category: Merchant.Category;
		cnpj: string | null;
		purchaseCount: number;
		totalSpentCents: number;
		firstPurchaseAt: string | null;
		lastPurchaseAt: string | null;
		lastAppliedPurchaseId: string | null;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'Merchant';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		id: string;
	};
}
