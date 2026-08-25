import { FileNotFound } from '@application/errors/application/FileNotFound';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { s3Client } from '@infra/clients/s3Client';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';

@Injectable()
export class FileStorageGateway {
	private static readonly EXPIRATION_IN_SECONDS = 300;

	constructor(private readonly appConfig: AppConfig) {}

	static getScanKey({
		accountId,
		scanId
	}: FileStorageGateway.GetScanKeyParams) {
		return `scans/${accountId}/${scanId}`;
	}

	static getOcrKey({ accountId, scanId }: FileStorageGateway.GetOcrKeyParams) {
		return `ocr/${accountId}/${scanId}.json`;
	}

	async getFile({
		key
	}: FileStorageGateway.GetFileParams): Promise<FileStorageGateway.GetFileResult> {
		const { Body, ContentType } = await s3Client.send(
			new GetObjectCommand({
				Bucket: this.appConfig.storage.s3.uploadsBucket,
				Key: key
			})
		);

		if (!Body) {
			throw new FileNotFound(key);
		}

		return {
			body: Buffer.from(await Body.transformToByteArray()),
			contentType: ContentType ?? 'application/octet-stream'
		};
	}

	async putFile({
		key,
		body,
		contentType
	}: FileStorageGateway.PutFileParams): Promise<void> {
		await s3Client.send(
			new PutObjectCommand({
				Bucket: this.appConfig.storage.s3.uploadsBucket,
				Key: key,
				Body: body,
				ContentType: contentType
			})
		);
	}

	async createPOST({
		key,
		contentType,
		maxSizeInBytes
	}: FileStorageGateway.CreatePostParams): Promise<FileStorageGateway.CreatePostResult> {
		const { url, fields } = await createPresignedPost(s3Client, {
			Bucket: this.appConfig.storage.s3.uploadsBucket,
			Key: key,
			Expires: FileStorageGateway.EXPIRATION_IN_SECONDS,
			Fields: {
				'Content-Type': contentType
			},
			Conditions: [
				['content-length-range', 1, maxSizeInBytes],
				['eq', '$Content-Type', contentType]
			]
		});

		return { url, fields };
	}
}

export namespace FileStorageGateway {
	export type GetScanKeyParams = {
		accountId: string;
		scanId: string;
	};

	export type GetOcrKeyParams = {
		accountId: string;
		scanId: string;
	};

	export type GetFileParams = {
		key: string;
	};

	export type GetFileResult = {
		body: Buffer;
		contentType: string;
	};

	export type PutFileParams = {
		key: string;
		body: string;
		contentType: string;
	};

	export type CreatePostParams = {
		key: string;
		contentType: string;
		maxSizeInBytes: number;
	};

	export type CreatePostResult = {
		url: string;
		fields: Record<string, string>;
	};
}
