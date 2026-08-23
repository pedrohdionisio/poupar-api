export class Receipt {
	readonly purchaseId: string;
	readonly accountId: string;
	readonly accessKey: string | null;
	readonly photoS3Key: string | null;
	readonly ocrS3Key: string | null;
	readonly items: Receipt.Item[];
	readonly createdAt: Date;

	constructor(attr: Receipt.Attributes) {
		this.purchaseId = attr.purchaseId;
		this.accountId = attr.accountId;
		this.accessKey = attr.accessKey;
		this.photoS3Key = attr.photoS3Key;
		this.ocrS3Key = attr.ocrS3Key;
		this.items = attr.items;
		this.createdAt = attr.createdAt ?? new Date();
	}
}

export namespace Receipt {
	export enum Unit {
		UN = 'UN',
		KG = 'KG',
		L = 'L'
	}

	export type Item = {
		seq: number;
		productKey: string;
		description: string;
		normalizedName: string;
		gtin: string | null;
		merchantCode: string | null;
		quantityMilli: number;
		unit: Receipt.Unit;
		unitPriceCents: number;
		totalCents: number;
		discountCents: number;
	};

	export type Attributes = {
		purchaseId: string;
		accountId: string;
		accessKey: string | null;
		photoS3Key: string | null;
		ocrS3Key: string | null;
		items: Receipt.Item[];
		createdAt?: Date;
	};
}
