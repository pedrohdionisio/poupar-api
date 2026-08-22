import { PurchaseDedupe } from '@application/entities/PurchaseDedupe';

export class PurchaseDedupeItem {
	static readonly type = 'PurchaseDedupe';
	private readonly keys: PurchaseDedupeItem.Keys;

	constructor(private readonly attr: PurchaseDedupeItem.Attributes) {
		this.keys = {
			PK: PurchaseDedupeItem.getPK({ accountId: this.attr.accountId }),
			SK: PurchaseDedupeItem.getSK({ accessKey: this.attr.accessKey })
		};
	}

	toItem(): PurchaseDedupeItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: PurchaseDedupeItem.type
		};
	}

	static fromEntity({ entity }: PurchaseDedupeItem.FromEntityParams) {
		return new PurchaseDedupeItem({
			accountId: entity.accountId,
			accessKey: entity.accessKey,
			purchaseId: entity.purchaseId,
			createdAt: entity.createdAt.toISOString()
		});
	}

	static toEntity({ item }: PurchaseDedupeItem.ToEntityParams) {
		return new PurchaseDedupe({
			accountId: item.accountId,
			accessKey: item.accessKey,
			purchaseId: item.purchaseId,
			createdAt: new Date(item.createdAt)
		});
	}

	static getPK({
		accountId
	}: PurchaseDedupeItem.GetPKParams): PurchaseDedupeItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({
		accessKey
	}: PurchaseDedupeItem.GetSKParams): PurchaseDedupeItem['keys']['SK'] {
		return `ACCESS_KEY#${accessKey}`;
	}
}

export namespace PurchaseDedupeItem {
	export type FromEntityParams = {
		entity: PurchaseDedupe;
	};

	export type ToEntityParams = {
		item: PurchaseDedupeItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `ACCESS_KEY#${string}`;
	};

	export type Attributes = {
		accountId: string;
		accessKey: string;
		purchaseId: string;
		createdAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'PurchaseDedupe';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		accessKey: string;
	};
}
