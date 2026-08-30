import { Purchase } from '@application/entities/Purchase';
import { Scan } from '@application/entities/Scan';
import { ReceiptAlreadyImported } from '@application/errors/application/ReceiptAlreadyImported';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { Conflict } from '@application/errors/http/Conflict';
import { ImportPurchaseUseCase } from '@application/usecases/purchases/ImportPurchaseUseCase';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ConfirmScanUseCase {
	constructor(
		private readonly scanRepository: ScanRepository,
		private readonly importPurchaseUseCase: ImportPurchaseUseCase
	) {}

	async execute(
		input: ConfirmScanUseCase.Input
	): Promise<ConfirmScanUseCase.Output> {
		const { accountId, scanId, ...payload } = input;

		const scan = await this.scanRepository.getById({
			accountId,
			id: scanId
		});

		if (!scan) {
			throw new ResourceNotFound(`Scan "${scanId}" not found.`);
		}

		if (scan.status !== Scan.Status.AWAITING_REVIEW) {
			throw new Conflict(
				`Scan "${scanId}" is "${scan.status}" and cannot be confirmed.`
			);
		}

		const purchase = await this.import({
			accountId,
			scanId,
			scan,
			payload
		});

		await this.scanRepository.markAsDone({
			accountId,
			id: scanId,
			purchaseId: purchase.purchaseId
		});

		return purchase;
	}

	private async import({
		accountId,
		scanId,
		scan,
		payload
	}: ConfirmScanUseCase.ImportParams): Promise<ConfirmScanUseCase.Output> {
		try {
			return await this.importPurchaseUseCase.execute({
				...payload,
				accountId,
				merchantId: scan.merchantId,
				source: Purchase.Source.OCR,
				photoS3Key: scan.photoS3Key,
				ocrS3Key: scan.ocrS3Key
			});
		} catch (error) {
			if (error instanceof ReceiptAlreadyImported) {
				await this.scanRepository.markAsFailed({
					accountId,
					id: scanId,
					errorCode: Scan.ErrorCode.DUPLICATE_RECEIPT,
					purchaseId: (error.details?.purchaseId as string) ?? null,
					ocrS3Key: scan.ocrS3Key,
					expectedStatus: Scan.Status.AWAITING_REVIEW
				});
			}

			throw error;
		}
	}
}

export namespace ConfirmScanUseCase {
	export type Payload = Omit<
		ImportPurchaseUseCase.Input,
		'accountId' | 'merchantId' | 'source' | 'photoS3Key' | 'ocrS3Key'
	>;

	export type Input = Payload & {
		accountId: string;
		scanId: string;
	};

	export type Output = ImportPurchaseUseCase.Output;

	export type ImportParams = {
		accountId: string;
		scanId: string;
		scan: Scan;
		payload: Payload;
	};
}
