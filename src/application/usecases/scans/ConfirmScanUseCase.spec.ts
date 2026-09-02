import { Purchase } from '@application/entities/Purchase';
import { Scan } from '@application/entities/Scan';
import { ReceiptAlreadyImported } from '@application/errors/application/ReceiptAlreadyImported';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { Conflict } from '@application/errors/http/Conflict';
import { ImportPurchaseUseCase } from '@application/usecases/purchases/ImportPurchaseUseCase';
import { ConfirmScanUseCase } from '@application/usecases/scans/ConfirmScanUseCase';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { createMock } from '@test/createMock';
import { makePayloadItem } from '@test/factories/makePayloadItem';
import { makeScan } from '@test/factories/makeScan';
import {
	ACCESS_KEY,
	ACCOUNT_ID,
	MERCHANT_ID,
	PURCHASE_ID,
	SCAN_ID
} from '@test/fixtures';
import { describe, expect, it } from 'vitest';

const OUTPUT: ImportPurchaseUseCase.Output = {
	purchaseId: PURCHASE_ID,
	purchasedAt: new Date('2026-02-19T17:30:00.000Z'),
	itemCount: 1,
	totalCents: 2500
};

type Dependencies = {
	scan?: Scan | null;
	importError?: Error;
};

function makeSut(dependencies: Dependencies = {}) {
	const { scan = makeScan(), importError } = dependencies;

	const scanRepository = createMock(ScanRepository, {
		getById: async () => scan
	});
	const importPurchaseUseCase = createMock(ImportPurchaseUseCase, {
		execute: async () => {
			if (importError) {
				throw importError;
			}

			return OUTPUT;
		}
	});

	const sut = new ConfirmScanUseCase(scanRepository, importPurchaseUseCase);

	return { sut, scanRepository, importPurchaseUseCase };
}

function makeInput(overrides: Partial<ConfirmScanUseCase.Input> = {}) {
	return {
		accountId: ACCOUNT_ID,
		scanId: SCAN_ID,
		purchasedAt: '2026-02-19T17:30:00.000Z',
		accessKey: ACCESS_KEY,
		totalCents: 2500,
		discountCents: 0,
		items: [makePayloadItem()],
		...overrides
	};
}

describe('ConfirmScanUseCase guards', () => {
	it('should throw when the scan does not belong to the account', async () => {
		const { sut, importPurchaseUseCase } = makeSut({ scan: null });

		await expect(sut.execute(makeInput())).rejects.toThrow(ResourceNotFound);
		expect(importPurchaseUseCase.execute).not.toHaveBeenCalled();
	});

	it('should refuse a scan that is not awaiting review', async () => {
		const { sut, importPurchaseUseCase } = makeSut({
			scan: makeScan({ status: Scan.Status.PROCESSING })
		});

		await expect(sut.execute(makeInput())).rejects.toThrow(Conflict);
		expect(importPurchaseUseCase.execute).not.toHaveBeenCalled();
	});

	it('should refuse a scan that was already confirmed', async () => {
		const { sut } = makeSut({
			scan: makeScan({ status: Scan.Status.DONE, purchaseId: PURCHASE_ID })
		});

		await expect(sut.execute(makeInput())).rejects.toThrow(Conflict);
	});
});

describe('ConfirmScanUseCase import', () => {
	it('should import the reviewed payload with the data held by the scan', async () => {
		const { sut, importPurchaseUseCase } = makeSut();

		await sut.execute(makeInput());

		expect(importPurchaseUseCase.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				accountId: ACCOUNT_ID,
				merchantId: MERCHANT_ID,
				source: Purchase.Source.OCR,
				photoS3Key: `scans/${ACCOUNT_ID}/${SCAN_ID}/photo.jpg`,
				ocrS3Key: `scans/${ACCOUNT_ID}/${SCAN_ID}/ocr.json`,
				accessKey: ACCESS_KEY,
				totalCents: 2500
			})
		);
	});

	it('should not let the caller choose the merchant or the source', async () => {
		const { sut, importPurchaseUseCase } = makeSut({
			scan: makeScan({ merchantId: 'the-scan-merchant' })
		});

		await sut.execute(
			makeInput({
				merchantId: 'another-merchant',
				source: Purchase.Source.MANUAL
			} as Partial<ConfirmScanUseCase.Input>)
		);

		expect(importPurchaseUseCase.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				merchantId: 'the-scan-merchant',
				source: Purchase.Source.OCR
			})
		);
	});

	it('should close the scan with the created purchase', async () => {
		const { sut, scanRepository } = makeSut();

		const output = await sut.execute(makeInput());

		expect(output).toStrictEqual(OUTPUT);
		expect(scanRepository.markAsDone).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			id: SCAN_ID,
			purchaseId: PURCHASE_ID
		});
	});
});

describe('ConfirmScanUseCase duplicate receipt', () => {
	it('should mark the scan as duplicate and rethrow', async () => {
		const error = new ReceiptAlreadyImported(PURCHASE_ID);
		const { sut, scanRepository } = makeSut({ importError: error });

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).toHaveBeenCalledWith({
			accountId: ACCOUNT_ID,
			id: SCAN_ID,
			errorCode: Scan.ErrorCode.DUPLICATE_RECEIPT,
			purchaseId: PURCHASE_ID,
			ocrS3Key: `scans/${ACCOUNT_ID}/${SCAN_ID}/ocr.json`,
			expectedStatus: Scan.Status.AWAITING_REVIEW
		});
		expect(scanRepository.markAsDone).not.toHaveBeenCalled();
	});

	it('should mark the scan as duplicate even without a purchase to point to', async () => {
		const { sut, scanRepository } = makeSut({
			importError: new ReceiptAlreadyImported(null)
		});

		await expect(sut.execute(makeInput())).rejects.toThrow(
			ReceiptAlreadyImported
		);
		expect(scanRepository.markAsFailed).toHaveBeenCalledWith(
			expect.objectContaining({ purchaseId: null })
		);
	});

	it('should leave the scan open when the import fails for another reason', async () => {
		const error = new Error('dynamo is down');
		const { sut, scanRepository } = makeSut({ importError: error });

		await expect(sut.execute(makeInput())).rejects.toBe(error);
		expect(scanRepository.markAsFailed).not.toHaveBeenCalled();
		expect(scanRepository.markAsDone).not.toHaveBeenCalled();
	});
});
