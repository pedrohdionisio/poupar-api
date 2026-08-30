import { Receipt } from '@application/entities/Receipt';

export class AccountProduct {
	readonly accountId: string;
	readonly productKey: string;
	readonly createdAt: Date;

	name: string;
	normalizedName: string;
	gtin: string | null;
	unit: Receipt.Unit;
	lastUnitPriceCents: number;
	previousUnitPriceCents: number | null;
	minPriceCents: number;
	maxPriceCents: number;
	lastPurchaseAt: Date;
	lastMerchantId: string;
	purchaseCount: number;
	lastAppliedPurchaseId: string;
	updatedAt: Date;

	constructor(attr: AccountProduct.Attributes) {
		this.accountId = attr.accountId;
		this.productKey = attr.productKey;
		this.name = attr.name;
		this.normalizedName = attr.normalizedName;
		this.gtin = attr.gtin;
		this.unit = attr.unit;
		this.lastUnitPriceCents = attr.lastUnitPriceCents;
		this.previousUnitPriceCents = attr.previousUnitPriceCents;
		this.minPriceCents = attr.minPriceCents;
		this.maxPriceCents = attr.maxPriceCents;
		this.lastPurchaseAt = attr.lastPurchaseAt;
		this.lastMerchantId = attr.lastMerchantId;
		this.purchaseCount = attr.purchaseCount;
		this.lastAppliedPurchaseId = attr.lastAppliedPurchaseId;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}
}

export namespace AccountProduct {
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
		lastPurchaseAt: Date;
		lastMerchantId: string;
		purchaseCount: number;
		lastAppliedPurchaseId: string;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
