import { Receipt } from '@application/entities/Receipt';

export class ReceiptItem {
	static readonly type = 'Receipt';
	private readonly keys: ReceiptItem.Keys;

	constructor(private readonly attr: ReceiptItem.Attributes) {
		this.keys = {
			PK: ReceiptItem.getPK({ accountId: this.attr.accountId }),
			SK: ReceiptItem.getSK({ purchaseId: this.attr.purchaseId })
		};
	}

	toItem(): ReceiptItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: ReceiptItem.type
		};
	}

	static fromEntity({ entity }: ReceiptItem.FromEntityParams) {
		return new ReceiptItem({
			purchaseId: entity.purchaseId,
			accountId: entity.accountId,
			accessKey: entity.accessKey,
			photoS3Key: entity.photoS3Key,
			ocrS3Key: entity.ocrS3Key,
			items: entity.items,
			createdAt: entity.createdAt.toISOString()
		});
	}

	static toEntity({ item }: ReceiptItem.ToEntityParams) {
		return new Receipt({
			purchaseId: item.purchaseId,
			accountId: item.accountId,
			accessKey: item.accessKey,
			photoS3Key: item.photoS3Key,
			ocrS3Key: item.ocrS3Key,
			items: item.items,
			createdAt: new Date(item.createdAt)
		});
	}

	static getPK({
		accountId
	}: ReceiptItem.GetPKParams): ReceiptItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({
		purchaseId
	}: ReceiptItem.GetSKParams): ReceiptItem['keys']['SK'] {
		return `RECEIPT#${purchaseId}`;
	}
}

export namespace ReceiptItem {
	export type FromEntityParams = {
		entity: Receipt;
	};

	export type ToEntityParams = {
		item: ReceiptItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `RECEIPT#${string}`;
	};

	export type Attributes = {
		purchaseId: string;
		accountId: string;
		accessKey: string | null;
		photoS3Key: string;
		ocrS3Key: string | null;
		items: Receipt.Item[];
		createdAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'Receipt';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		purchaseId: string;
	};
}
