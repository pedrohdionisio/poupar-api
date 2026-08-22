import { Receipt } from '@application/entities/Receipt';

export class PricePoint {
	readonly accountId: string;
	readonly productKey: string;
	readonly purchaseId: string;
	readonly purchasedAt: Date;
	readonly merchantCnpj: string;
	readonly unitPriceCents: number;
	readonly quantityMilli: number;
	readonly unit: Receipt.Unit;

	constructor(attr: PricePoint.Attributes) {
		this.accountId = attr.accountId;
		this.productKey = attr.productKey;
		this.purchaseId = attr.purchaseId;
		this.purchasedAt = attr.purchasedAt;
		this.merchantCnpj = attr.merchantCnpj;
		this.unitPriceCents = attr.unitPriceCents;
		this.quantityMilli = attr.quantityMilli;
		this.unit = attr.unit;
	}
}

export namespace PricePoint {
	export type Attributes = {
		accountId: string;
		productKey: string;
		purchaseId: string;
		purchasedAt: Date;
		merchantCnpj: string;
		unitPriceCents: number;
		quantityMilli: number;
		unit: Receipt.Unit;
	};
}
