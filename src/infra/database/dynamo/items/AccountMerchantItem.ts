import { AccountMerchant } from '@application/entities/AccountMerchant';
import { Merchant } from '@application/entities/Merchant';

export class AccountMerchantItem {
	static readonly type = 'AccountMerchant';
	private readonly keys: AccountMerchantItem.Keys;

	constructor(private readonly attr: AccountMerchantItem.Attributes) {
		this.keys = {
			PK: AccountMerchantItem.getPK({ accountId: this.attr.accountId }),
			SK: AccountMerchantItem.getSK({ cnpj: this.attr.merchantCnpj })
		};
	}

	toItem(): AccountMerchantItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: AccountMerchantItem.type
		};
	}

	static fromEntity({ entity }: AccountMerchantItem.FromEntityParams) {
		return new AccountMerchantItem({
			accountId: entity.accountId,
			merchantCnpj: entity.merchantCnpj,
			alias: entity.alias,
			name: entity.name,
			category: entity.category,
			purchaseCount: entity.purchaseCount,
			totalSpentCents: entity.totalSpentCents,
			firstPurchaseAt: entity.firstPurchaseAt.toISOString(),
			lastPurchaseAt: entity.lastPurchaseAt.toISOString(),
			lastAppliedPurchaseId: entity.lastAppliedPurchaseId,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: AccountMerchantItem.ToEntityParams) {
		return new AccountMerchant({
			accountId: item.accountId,
			merchantCnpj: item.merchantCnpj,
			alias: item.alias,
			name: item.name,
			category: item.category,
			purchaseCount: item.purchaseCount,
			totalSpentCents: item.totalSpentCents,
			firstPurchaseAt: new Date(item.firstPurchaseAt),
			lastPurchaseAt: new Date(item.lastPurchaseAt),
			lastAppliedPurchaseId: item.lastAppliedPurchaseId,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({
		accountId
	}: AccountMerchantItem.GetPKParams): AccountMerchantItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({
		cnpj
	}: AccountMerchantItem.GetSKParams): AccountMerchantItem['keys']['SK'] {
		return `MERCHANT#${cnpj}`;
	}

	static getSKPrefix(): 'MERCHANT#' {
		return 'MERCHANT#';
	}
}

export namespace AccountMerchantItem {
	export type FromEntityParams = {
		entity: AccountMerchant;
	};

	export type ToEntityParams = {
		item: AccountMerchantItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `MERCHANT#${string}`;
	};

	export type Attributes = {
		accountId: string;
		merchantCnpj: string;
		alias: string | null;
		name: string;
		category: Merchant.Category;
		purchaseCount: number;
		totalSpentCents: number;
		firstPurchaseAt: string;
		lastPurchaseAt: string;
		lastAppliedPurchaseId: string;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'AccountMerchant';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		cnpj: string;
	};
}
