import { Merchant } from '@application/entities/Merchant';
import { ulid } from 'ulid';

export class Purchase {
	readonly id: string;
	readonly accountId: string;
	readonly purchasedAt: Date;
	readonly createdAt: Date;

	merchantId: string;
	merchantName: string;
	category: Merchant.Category;
	totalCents: number;
	discountCents: number;
	itemCount: number;
	accessKey: string | null;
	source: Purchase.Source;
	updatedAt: Date;

	constructor(attr: Purchase.Attributes) {
		this.id = attr.id ?? ulid();
		this.accountId = attr.accountId;
		this.purchasedAt = attr.purchasedAt;
		this.merchantId = attr.merchantId;
		this.merchantName = attr.merchantName;
		this.category = attr.category;
		this.totalCents = attr.totalCents;
		this.discountCents = attr.discountCents;
		this.itemCount = attr.itemCount;
		this.accessKey = attr.accessKey;
		this.source = attr.source;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}
}

export namespace Purchase {
	export enum Source {
		OCR = 'OCR',
		MANUAL = 'MANUAL'
	}

	export type Attributes = {
		id?: string;
		accountId: string;
		purchasedAt: Date;
		merchantId: string;
		merchantName: string;
		category: Merchant.Category;
		totalCents: number;
		discountCents: number;
		itemCount: number;
		accessKey: string | null;
		source: Purchase.Source;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
