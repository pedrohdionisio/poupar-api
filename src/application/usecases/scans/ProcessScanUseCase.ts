import { Scan } from '@application/entities/Scan';
import { ReceiptExtractionFailed } from '@application/errors/application/ReceiptExtractionFailed';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ScanExtractionNormalizer } from '@application/normalizers/ScanExtractionNormalizer';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { PurchaseDedupeRepository } from '@infra/database/dynamo/repositories/PurchaseDedupeRepository';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { FileStorageGateway } from '@infra/gateways/FileStorageGateway';
import { ReceiptExtractionGateway } from '@infra/gateways/ReceiptExtractionGateway';
import { Injectable } from '@kernel/decorators/Injectable';

const MAX_ATTEMPTS = 3;
const MAX_KNOWN_PRODUCTS = 400;

@Injectable()
export class ProcessScanUseCase {
	constructor(
		private readonly scanRepository: ScanRepository,
		private readonly purchaseDedupeRepository: PurchaseDedupeRepository,
		private readonly accountProductRepository: AccountProductRepository,
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

		const { started, attempts } = await this.scanRepository.startProcessing({
			accountId,
			id: scanId
		});

		if (!started) {
			return;
		}

		try {
			await this.extract({ accountId, scanId, scan });
		} catch (error) {
			const transient = ProcessScanUseCase.isTransient({ error });

			if (!transient || attempts >= MAX_ATTEMPTS) {
				await this.fail({
					accountId,
					scanId,
					ocrS3Key: scan.ocrS3Key,
					errorCode: Scan.ErrorCode.INTERNAL_ERROR
				});
			}

			throw error;
		}
	}

	private async extract({
		accountId,
		scanId,
		scan
	}: ProcessScanUseCase.ExtractParams): Promise<void> {
		const [photo, vocabulary] = await Promise.all([
			this.fileStorageGateway.getFile({ key: scan.photoS3Key }),
			this.getVocabulary({ accountId })
		]);

		const { rawJson, extraction } = await this.receiptExtractionGateway.extract(
			{
				image: photo.body,
				mimeType: photo.contentType,
				knownProducts: vocabulary.knownProducts
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

		const draft = this.toDraft({
			extraction,
			namesByGtin: vocabulary.namesByGtin
		});

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

	private static isTransient({
		error
	}: ProcessScanUseCase.IsTransientParams): boolean {
		if (error instanceof ReceiptExtractionFailed) {
			return error.details?.retryable === true;
		}

		const { $retryable, $metadata } = error as ProcessScanUseCase.AwsError;

		if ($retryable) {
			return true;
		}

		const statusCode = $metadata?.httpStatusCode;

		return (
			statusCode !== undefined && (statusCode === 429 || statusCode >= 500)
		);
	}

	private async getVocabulary({
		accountId
	}: ProcessScanUseCase.GetVocabularyParams): Promise<ProcessScanUseCase.Vocabulary> {
		const accountProducts = await this.accountProductRepository.listByAccount({
			accountId
		});

		const mostRecent = accountProducts
			.sort((a, b) => b.lastPurchaseAt.getTime() - a.lastPurchaseAt.getTime())
			.slice(0, MAX_KNOWN_PRODUCTS);

		const namesByGtin = new Map<string, string>();

		for (const accountProduct of mostRecent) {
			if (accountProduct.gtin) {
				namesByGtin.set(accountProduct.gtin, accountProduct.name);
			}
		}

		return {
			knownProducts: mostRecent.map((accountProduct) => accountProduct.name),
			namesByGtin
		};
	}

	private toDraft({
		extraction,
		namesByGtin
	}: ProcessScanUseCase.ToDraftParams): Scan.Draft | null {
		try {
			return ScanExtractionNormalizer.toDraft({ extraction, namesByGtin });
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

	export type IsTransientParams = {
		error: unknown;
	};

	export type AwsError = {
		$retryable?: unknown;
		$metadata?: { httpStatusCode?: number };
	};

	export type GetVocabularyParams = {
		accountId: string;
	};

	export type Vocabulary = {
		knownProducts: string[];
		namesByGtin: Map<string, string>;
	};

	export type ToDraftParams = {
		extraction: NonNullable<
			ReceiptExtractionGateway.ExtractResult['extraction']
		>;
		namesByGtin: Map<string, string>;
	};

	export type ExtractParams = {
		accountId: string;
		scanId: string;
		scan: Scan;
	};

	export type FailParams = {
		accountId: string;
		scanId: string;
		ocrS3Key: string | null;
		errorCode: Scan.ErrorCode;
		purchaseId?: string | null;
	};
}
