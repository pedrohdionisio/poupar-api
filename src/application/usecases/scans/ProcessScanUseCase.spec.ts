import { Scan } from '@application/entities/Scan';
import { ReceiptExtractionFailed } from '@application/errors/application/ReceiptExtractionFailed';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ProcessScanUseCase } from '@application/usecases/scans/ProcessScanUseCase';
import { AccountProductRepository } from '@infra/database/dynamo/repositories/AccountProductRepository';
import { PurchaseDedupeRepository } from '@infra/database/dynamo/repositories/PurchaseDedupeRepository';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { FileStorageGateway } from '@infra/gateways/FileStorageGateway';
import { ReceiptExtractionGateway } from '@infra/gateways/ReceiptExtractionGateway';
import { createMock } from '@test/createMock';
import { makeAccountProduct } from '@test/factories/makeAccountProduct';
import {
	makeExtraction,
	makeExtractionItem
} from '@test/factories/makeExtraction';
import { makePurchaseDedupe } from '@test/factories/makePurchaseDedupe';
import { makeScan } from '@test/factories/makeScan';
import { ACCOUNT_ID, ARROZ_GTIN, PURCHASE_ID, SCAN_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const OCR_KEY = FileStorageGateway.getOcrKey({
	accountId: ACCOUNT_ID,
	scanId: SCAN_ID
});

type Dependencies = {
	scan?: Scan | null;
	started?: boolean;
	attempts?: number;
	accountProducts?: ReturnType<typeof makeAccountProduct>[];
	extraction?: ReceiptExtractionGateway.Extraction | null;
	extractError?: Error;
	imported?: ReturnType<typeof makePurchaseDedupe> | null;
};

function makeSut(dependencies: Dependencies = {}) {
	const {
		scan = makeScan({ status: Scan.Status.PENDING, draft: null, attempts: 0 }),
		started = true,
		attempts = 1,
		accountProducts = [],
		extraction = makeExtraction(),
		extractError,
		imported = null
	} = dependencies;

	const scanRepository = createMock(ScanRepository, {
		getById: async () => scan,
		startProcessing: async () => ({ started, attempts })
	});
	const purchaseDedupeRepository = createMock(PurchaseDedupeRepository, {
		getByAccessKey: async () => imported
	});
	const accountProductRepository = createMock(AccountProductRepository, {
		listByAccount: async () => accountProducts
	});
	const fileStorageGateway = createMock(FileStorageGateway, {
		getFile: async () => ({
			body: Buffer.from('photo'),
			contentType: 'image/jpeg'
		})
	});
	const receiptExtractionGateway = createMock(ReceiptExtractionGateway, {
		extract: async () => {
			if (extractError) {
				throw extractError;
			}

			return { rawJson: '{"readable":true}', extraction };
		}
	});

	const sut = new ProcessScanUseCase(
		scanRepository,
		purchaseDedupeRepository,
		accountProductRepository,
		fileStorageGateway,
		receiptExtractionGateway
	);

	return {
		sut,
		scanRepository,
		purchaseDedupeRepository,
		accountProductRepository,
		fileStorageGateway,
		receiptExtractionGateway
	};
}

function makeInput() {
	return { accountId: ACCOUNT_ID, scanId: SCAN_ID };
}

describe('ProcessScanUseCase guards', () => {
	it('should throw when the scan does not belong to the account', async () => {
		const { sut, receiptExtractionGateway } = makeSut({ scan: null });

		await expect(sut.execute(makeInput())).rejects.toThrow(ResourceNotFound);
		expect(receiptExtractionGateway.extract).not.toHaveBeenCalled();
	});

	it('should do nothing when another worker already took the scan', async () => {
		const { sut, receiptExtractionGateway, fileStorageGateway } = makeSut({
			started: false
		});

		await expect(sut.execute(makeInput())).resolves.toBeUndefined();
		expect(fileStorageGateway.getFile).not.toHaveBeenCalled();
		expect(receiptExtractionGateway.extract).not.toHaveBeenCalled();
	});
});

describe('ProcessScanUseCase extraction', () => {
	it('should store the raw model output before reading it', async () => {
		const { sut, fileStorageGateway } = makeSut();

		await sut.execute(makeInput());

		expect(fileStorageGateway.putFile).toHaveBeenCalledWith({
			key: OCR_KEY,
			body: '{"readable":true}',
			contentType: 'application/json'
		});
	});

	it('should hand the draft over for review', async () => {
		const { sut, scanRepository } = makeSut();

		await sut.execute(makeInput());

		expect(scanRepository.markAsAwaitingReview).toHaveBeenCalledWith(
			expect.objectContaining({
				accountId: ACCOUNT_ID,
				id: SCAN_ID,
				ocrS3Key: OCR_KEY
			})
		);
		expect(scanRepository.markAsFailed).not.toHaveBeenCalled();
	});

	it('should fail as unparsed when the model output does not match the schema', async () => {
		const { sut, scanRepository } = makeSut({ extraction: null });

		await sut.execute(makeInput());

		expect(scanRepository.markAsFailed).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			id: SCAN_ID,
			ocrS3Key: OCR_KEY,
			errorCode: Scan.ErrorCode.PARSE_FAILED,
			purchaseId: null
		});
		expect(scanRepository.markAsAwaitingReview).not.toHaveBeenCalled();
	});

	it('should fail as unreadable when the model could not read the photo', async () => {
		const { sut, scanRepository } = makeSut({
			extraction: makeExtraction({ readable: false })
		});

		await sut.execute(makeInput());

		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: Scan.ErrorCode.UNREADABLE_PHOTO })
		);
	});

	it('should fail as unreadable when the receipt has no items', async () => {
		const { sut, scanRepository } = makeSut({
			extraction: makeExtraction({ items: [] })
		});

		await sut.execute(makeInput());

		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: Scan.ErrorCode.UNREADABLE_PHOTO })
		);
	});

	it('should fail as unparsed when the extracted values cannot be normalized', async () => {
		const { sut, scanRepository } = makeSut({
			extraction: makeExtraction({ issuedAt: 'sem data' })
		});

		await sut.execute(makeInput());

		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: Scan.ErrorCode.PARSE_FAILED })
		);
	});

	it('should fail as duplicate when the access key was already imported', async () => {
		const { sut, scanRepository } = makeSut({
			imported: makePurchaseDedupe()
		});

		await sut.execute(makeInput());

		expect(scanRepository.markAsFailed).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			id: SCAN_ID,
			ocrS3Key: OCR_KEY,
			errorCode: Scan.ErrorCode.DUPLICATE_RECEIPT,
			purchaseId: PURCHASE_ID
		});
	});

	it('should not look for a duplicate when the receipt has no access key', async () => {
		const { sut, purchaseDedupeRepository, scanRepository } = makeSut({
			extraction: makeExtraction({ accessKey: '123' })
		});

		await sut.execute(makeInput());

		expect(purchaseDedupeRepository.getByAccessKey).not.toHaveBeenCalled();
		expect(scanRepository.markAsAwaitingReview).toHaveBeenCalled();
	});
});

describe('ProcessScanUseCase vocabulary', () => {
	it('should send the known product names to the model', async () => {
		const { sut, receiptExtractionGateway } = makeSut({
			accountProducts: [
				makeAccountProduct({ name: 'Arroz Tio João 5kg' }),
				makeAccountProduct({ name: 'Leite Integral 1L' })
			]
		});

		await sut.execute(makeInput());

		expect(receiptExtractionGateway.extract).toHaveBeenCalledWith(
			expect.objectContaining({
				knownProducts: ['Arroz Tio João 5kg', 'Leite Integral 1L']
			})
		);
	});

	it('should rename an extracted item to the known product of the same GTIN', async () => {
		const { sut, scanRepository } = makeSut({
			accountProducts: [
				makeAccountProduct({ name: 'Arroz Tio João 5kg', gtin: ARROZ_GTIN })
			],
			extraction: makeExtraction({
				items: [
					makeExtractionItem({
						gtin: ARROZ_GTIN,
						normalizedName: 'Arroz Tio Joao'
					})
				]
			})
		});

		await sut.execute(makeInput());

		const [{ draft }] = scanRepository.markAsAwaitingReview.mock.calls[0]!;

		expect(draft.items[0].displayName).toBe('Arroz Tio João 5kg');
	});

	it('should order the vocabulary from the most recent purchase', async () => {
		const { sut, receiptExtractionGateway } = makeSut({
			accountProducts: [
				makeAccountProduct({
					name: 'Comprado ontem',
					lastPurchaseAt: new Date('2026-02-18T12:00:00.000Z')
				}),
				makeAccountProduct({
					name: 'Comprado hoje',
					lastPurchaseAt: new Date('2026-02-19T12:00:00.000Z')
				})
			]
		});

		await sut.execute(makeInput());

		expect(receiptExtractionGateway.extract).toHaveBeenCalledWith(
			expect.objectContaining({
				knownProducts: ['Comprado hoje', 'Comprado ontem']
			})
		);
	});
});

describe('ProcessScanUseCase failures', () => {
	it('should keep a transient failure open for retry', async () => {
		const error = new ReceiptExtractionFailed('OpenAI responded 429', true);
		const { sut, scanRepository } = makeSut({
			extractError: error,
			attempts: 1
		});

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).not.toHaveBeenCalled();
	});

	it('should give up on a transient failure after the last attempt', async () => {
		const error = new ReceiptExtractionFailed('OpenAI responded 429', true);
		const { sut, scanRepository } = makeSut({
			extractError: error,
			attempts: 3
		});

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: Scan.ErrorCode.INTERNAL_ERROR })
		);
	});

	it('should give up right away on a permanent failure', async () => {
		const error = new ReceiptExtractionFailed('OpenAI refused', false);
		const { sut, scanRepository } = makeSut({
			extractError: error,
			attempts: 1
		});

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: Scan.ErrorCode.INTERNAL_ERROR })
		);
	});

	it('should treat a retryable AWS error as transient', async () => {
		const error = Object.assign(new Error('throttled'), { $retryable: {} });
		const { sut, scanRepository } = makeSut({
			extractError: error,
			attempts: 1
		});

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).not.toHaveBeenCalled();
	});

	it('should treat a 5xx from AWS as transient', async () => {
		const error = Object.assign(new Error('service unavailable'), {
			$metadata: { httpStatusCode: 503 }
		});
		const { sut, scanRepository } = makeSut({
			extractError: error,
			attempts: 1
		});

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).not.toHaveBeenCalled();
	});

	it('should treat a 4xx from AWS as permanent', async () => {
		const error = Object.assign(new Error('bad request'), {
			$metadata: { httpStatusCode: 400 }
		});
		const { sut, scanRepository } = makeSut({
			extractError: error,
			attempts: 1
		});

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: Scan.ErrorCode.INTERNAL_ERROR })
		);
	});
});
