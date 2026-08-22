export class PurchaseDedupe {
	readonly accountId: string;
	readonly accessKey: string;
	readonly purchaseId: string;
	readonly createdAt: Date;

	constructor(attr: PurchaseDedupe.Attributes) {
		this.accountId = attr.accountId;
		this.accessKey = attr.accessKey;
		this.purchaseId = attr.purchaseId;
		this.createdAt = attr.createdAt ?? new Date();
	}
}

export namespace PurchaseDedupe {
	export type Attributes = {
		accountId: string;
		accessKey: string;
		purchaseId: string;
		createdAt?: Date;
	};
}
