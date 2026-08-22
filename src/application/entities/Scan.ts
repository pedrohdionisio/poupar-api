import { ulid } from 'ulid';

export class Scan {
	readonly id: string;
	readonly accountId: string;
	readonly createdAt: Date;

	status: Scan.Status;
	photoS3Key: string;
	provider: Scan.Provider;
	purchaseId: string | null;
	errorCode: Scan.ErrorCode | null;
	attempts: number;
	ttl: number;
	updatedAt: Date;

	constructor(attr: Scan.Attributes) {
		this.id = attr.id ?? ulid();
		this.accountId = attr.accountId;
		this.status = attr.status;
		this.photoS3Key = attr.photoS3Key;
		this.provider = attr.provider;
		this.purchaseId = attr.purchaseId;
		this.errorCode = attr.errorCode;
		this.attempts = attr.attempts;
		this.ttl = attr.ttl;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}
}

export namespace Scan {
	export enum Status {
		PENDING = 'PENDING',
		PROCESSING = 'PROCESSING',
		DONE = 'DONE',
		FAILED = 'FAILED'
	}

	export enum Provider {
		GEMINI = 'GEMINI',
		MANUAL = 'MANUAL'
	}

	export enum ErrorCode {
		UNREADABLE_PHOTO = 'UNREADABLE_PHOTO',
		PARSE_FAILED = 'PARSE_FAILED',
		DUPLICATE_RECEIPT = 'DUPLICATE_RECEIPT',
		INTERNAL_ERROR = 'INTERNAL_ERROR'
	}

	export type Attributes = {
		id?: string;
		accountId: string;
		status: Scan.Status;
		photoS3Key: string;
		provider: Scan.Provider;
		purchaseId: string | null;
		errorCode: Scan.ErrorCode | null;
		attempts: number;
		ttl: number;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
