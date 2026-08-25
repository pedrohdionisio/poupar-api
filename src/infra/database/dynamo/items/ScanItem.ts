import { Scan } from '@application/entities/Scan';

export class ScanItem {
	static readonly type = 'Scan';
	private readonly keys: ScanItem.Keys;

	constructor(private readonly attr: ScanItem.Attributes) {
		this.keys = {
			PK: ScanItem.getPK({ accountId: this.attr.accountId }),
			SK: ScanItem.getSK({ id: this.attr.id })
		};
	}

	toItem(): ScanItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: ScanItem.type
		};
	}

	static fromEntity({ entity }: ScanItem.FromEntityParams) {
		return new ScanItem({
			id: entity.id,
			accountId: entity.accountId,
			status: entity.status,
			photoS3Key: entity.photoS3Key,
			ocrS3Key: entity.ocrS3Key,
			provider: entity.provider,
			draft: entity.draft,
			purchaseId: entity.purchaseId,
			errorCode: entity.errorCode,
			attempts: entity.attempts,
			ttl: entity.ttl,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: ScanItem.ToEntityParams) {
		return new Scan({
			id: item.id,
			accountId: item.accountId,
			status: item.status,
			photoS3Key: item.photoS3Key,
			ocrS3Key: item.ocrS3Key,
			provider: item.provider,
			draft: item.draft,
			purchaseId: item.purchaseId,
			errorCode: item.errorCode,
			attempts: item.attempts,
			ttl: item.ttl,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({ accountId }: ScanItem.GetPKParams): ScanItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({ id }: ScanItem.GetSKParams): ScanItem['keys']['SK'] {
		return `SCAN#${id}`;
	}
}

export namespace ScanItem {
	export type FromEntityParams = {
		entity: Scan;
	};

	export type ToEntityParams = {
		item: ScanItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `SCAN#${string}`;
	};

	export type Attributes = {
		id: string;
		accountId: string;
		status: Scan.Status;
		photoS3Key: string;
		ocrS3Key: string | null;
		provider: Scan.Provider;
		draft: Scan.Draft | null;
		purchaseId: string | null;
		errorCode: Scan.ErrorCode | null;
		attempts: number;
		ttl: number;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'Scan';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		id: string;
	};
}
