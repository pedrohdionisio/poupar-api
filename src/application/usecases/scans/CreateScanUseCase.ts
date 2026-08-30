import { Scan } from '@application/entities/Scan';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { FileStorageGateway } from '@infra/gateways/FileStorageGateway';
import { Injectable } from '@kernel/decorators/Injectable';
import { ulid } from 'ulid';

const TTL_IN_SECONDS = 30 * 24 * 60 * 60;
const MAX_PHOTO_SIZE_IN_BYTES = 10 * 1024 * 1024;

@Injectable()
export class CreateScanUseCase {
	constructor(
		private readonly scanRepository: ScanRepository,
		private readonly merchantRepository: MerchantRepository,
		private readonly fileStorageGateway: FileStorageGateway
	) {}

	async execute(
		input: CreateScanUseCase.Input
	): Promise<CreateScanUseCase.Output> {
		const merchant = await this.merchantRepository.getById({
			accountId: input.accountId,
			id: input.merchantId
		});

		if (!merchant) {
			throw new ResourceNotFound('Merchant not found.');
		}

		const scanId = ulid();
		const photoS3Key = FileStorageGateway.getScanKey({
			accountId: input.accountId,
			scanId
		});

		const uploadSignature = await this.fileStorageGateway.createPOST({
			key: photoS3Key,
			contentType: input.contentType,
			maxSizeInBytes: MAX_PHOTO_SIZE_IN_BYTES
		});

		const scan = new Scan({
			id: scanId,
			accountId: input.accountId,
			merchantId: merchant.id,
			status: Scan.Status.PENDING,
			photoS3Key,
			ocrS3Key: null,
			provider: Scan.Provider.OPENAI,
			draft: null,
			purchaseId: null,
			errorCode: null,
			attempts: 0,
			ttl: Math.floor(Date.now() / 1000) + TTL_IN_SECONDS
		});

		await this.scanRepository.create({ scan });

		return {
			scanId: scan.id,
			uploadSignature
		};
	}
}

export namespace CreateScanUseCase {
	export type Input = {
		accountId: string;
		merchantId: string;
		contentType: string;
	};

	export type Output = {
		scanId: string;
		uploadSignature: FileStorageGateway.CreatePostResult;
	};
}
