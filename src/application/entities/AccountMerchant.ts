import { Merchant } from '@application/entities/Merchant';

export class AccountMerchant {
	readonly accountId: string;
	readonly merchantCnpj: string;
	readonly createdAt: Date;

	alias: string | null;
	name: string;
	category: Merchant.Category;
	purchaseCount: number;
	totalSpentCents: number;
	firstPurchaseAt: Date;
	lastPurchaseAt: Date;
	lastAppliedPurchaseId: string;
	updatedAt: Date;

	constructor(attr: AccountMerchant.Attributes) {
		this.accountId = attr.accountId;
		this.merchantCnpj = attr.merchantCnpj;
		this.alias = attr.alias;
		this.name = attr.name;
		this.category = attr.category;
		this.purchaseCount = attr.purchaseCount;
		this.totalSpentCents = attr.totalSpentCents;
		this.firstPurchaseAt = attr.firstPurchaseAt;
		this.lastPurchaseAt = attr.lastPurchaseAt;
		this.lastAppliedPurchaseId = attr.lastAppliedPurchaseId;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}
}

export namespace AccountMerchant {
	export type Attributes = {
		accountId: string;
		merchantCnpj: string;
		alias: string | null;
		name: string;
		category: Merchant.Category;
		purchaseCount: number;
		totalSpentCents: number;
		firstPurchaseAt: Date;
		lastPurchaseAt: Date;
		lastAppliedPurchaseId: string;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
