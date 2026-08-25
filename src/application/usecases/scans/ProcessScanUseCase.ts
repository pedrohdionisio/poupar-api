import { Scan } from '@application/entities/Scan';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ScanExtractionNormalizer } from '@application/normalizers/ScanExtractionNormalizer';
import { PurchaseDedupeRepository } from '@infra/database/dynamo/repositories/PurchaseDedupeRepository';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { FileStorageGateway } from '@infra/gateways/FileStorageGateway';
import { ReceiptExtractionGateway } from '@infra/gateways/ReceiptExtractionGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ProcessScanUseCase {
	constructor(
		private readonly scanRepository: ScanRepository,
		private readonly purchaseDedupeRepository: PurchaseDedupeRepository,
		private readonly fileStorageGateway: FileStorageGateway,
		private readonly receiptExtractionGateway: ReceiptExtractionGateway
	) {}

	async execute(input: ProcessScanUseCase.Input): Promise<void> {
		const { accountId, scanId } = input;

		const scan = await this.scanRepository.getById({
			accountId,
			id: scanId
		});

		if (!scan) {
			throw new ResourceNotFound(`Scan "${scanId}" not found.`);
		}

		const started = await this.scanRepository.startProcessing({
			accountId,
			id: scanId
		});

		if (!started) {
			return;
		}

		const photo = await this.fileStorageGateway.getFile({
			key: scan.photoS3Key
		});

		const { rawJson, extraction } = await this.receiptExtractionGateway.extract(
			{
				image: photo.body,
				mimeType: photo.contentType
			}
		);

		const ocrS3Key = FileStorageGateway.getOcrKey({ accountId, scanId });

		await this.fileStorageGateway.putFile({
			key: ocrS3Key,
			body: rawJson,
			contentType: 'application/json'
		});

		if (!extraction) {
			await this.fail({
				accountId,
				scanId,
				ocrS3Key,
				errorCode: Scan.ErrorCode.PARSE_FAILED
			});

			return;
		}

		if (!extraction.readable || extraction.items.length === 0) {
			await this.fail({
				accountId,
				scanId,
				ocrS3Key,
				errorCode: Scan.ErrorCode.UNREADABLE_PHOTO
			});

			return;
		}

		const draft = this.toDraft({ extraction });

		if (!draft) {
			await this.fail({
				accountId,
				scanId,
				ocrS3Key,
				errorCode: Scan.ErrorCode.PARSE_FAILED
			});

			return;
		}

		const imported = draft.accessKey
			? await this.purchaseDedupeRepository.getByAccessKey({
					accountId,
					accessKey: draft.accessKey
				})
			: null;

		if (imported) {
			await this.fail({
				accountId,
				scanId,
				ocrS3Key,
				errorCode: Scan.ErrorCode.DUPLICATE_RECEIPT,
				purchaseId: imported.purchaseId
			});

			return;
		}

		await this.scanRepository.markAsAwaitingReview({
			accountId,
			id: scanId,
			draft,
			ocrS3Key
		});
	}

	private toDraft({
		extraction
	}: ProcessScanUseCase.ToDraftParams): Scan.Draft | null {
		try {
			return ScanExtractionNormalizer.toDraft({ extraction });
		} catch {
			return null;
		}
	}

	private async fail({
		accountId,
		scanId,
		ocrS3Key,
		errorCode,
		purchaseId = null
	}: ProcessScanUseCase.FailParams): Promise<void> {
		await this.scanRepository.markAsFailed({
			accountId,
			id: scanId,
			errorCode,
			purchaseId,
			ocrS3Key
		});
	}
}

export namespace ProcessScanUseCase {
	export type Input = {
		accountId: string;
		scanId: string;
	};

	export type ToDraftParams = {
		extraction: NonNullable<
			ReceiptExtractionGateway.ExtractResult['extraction']
		>;
	};

	export type FailParams = {
		accountId: string;
		scanId: string;
		ocrS3Key: string;
		errorCode: Scan.ErrorCode;
		purchaseId?: string | null;
	};
}
