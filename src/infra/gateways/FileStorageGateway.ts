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
