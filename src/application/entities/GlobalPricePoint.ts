import { Receipt } from '@application/entities/Receipt';

export class GlobalPricePoint {
	readonly productKey: string;
	readonly purchasedAt: Date;
	readonly merchantCnpj: string;
	readonly unitPriceCents: number;
	readonly unit: Receipt.Unit;
	readonly city: string;
	readonly uf: string;

	constructor(attr: GlobalPricePoint.Attributes) {
		this.productKey = attr.productKey;
		this.purchasedAt = attr.purchasedAt;
		this.merchantCnpj = attr.merchantCnpj;
		this.unitPriceCents = attr.unitPriceCents;
		this.unit = attr.unit;
		this.city = attr.city;
		this.uf = attr.uf;
	}
}

export namespace GlobalPricePoint {
	export type Attributes = {
		productKey: string;
		purchasedAt: Date;
		merchantCnpj: string;
		unitPriceCents: number;
		unit: Receipt.Unit;
		city: string;
		uf: string;
	};
}
