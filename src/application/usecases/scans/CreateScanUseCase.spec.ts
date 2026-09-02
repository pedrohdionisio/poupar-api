import { Scan } from '@application/entities/Scan';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { CreateScanUseCase } from '@application/usecases/scans/CreateScanUseCase';
import { MerchantRepository } from '@infra/database/dynamo/repositories/MerchantRepository';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { FileStorageGateway } from '@infra/gateways/FileStorageGateway';
import { createMock } from '@test/createMock';
import { makeMerchant } from '@test/factories/makeMerchant';
import { ACCOUNT_ID, MERCHANT_ID } from '@test/fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date('2026-02-19T18:00:00.000Z');
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

const UPLOAD_SIGNATURE = {
	url: 'https://uploads.poupar.app',
	fields: { key: 'scans/key' }
};

type Dependencies = {
	merchant?: ReturnType<typeof makeMerchant> | null;
};

function makeSut(dependencies: Dependencies = {}) {
	const { merchant = makeMerchant() } = dependencies;

	const scanRepository = createMock(ScanRepository);
	const merchantRepository = createMock(MerchantRepository, {
		getById: async () => merchant
	});
	const fileStorageGateway = createMock(FileStorageGateway, {
		createPOST: async () =>
			UPLOAD_SIGNATURE as Awaited<ReturnType<FileStorageGateway['createPOST']>>
	});

	const sut = new CreateScanUseCase(
		scanRepository,
		merchantRepository,
		fileStorageGateway
	);

	return { sut, scanRepository, merchantRepository, fileStorageGateway };
}

function makeInput() {
	return {
		accountId: ACCOUNT_ID,
		merchantId: MERCHANT_ID,
		contentType: 'image/jpeg'
	};
}

describe('CreateScanUseCase', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should throw when the merchant does not belong to the account', async () => {
		const { sut, scanRepository, fileStorageGateway } = makeSut({
			merchant: null
		});

		await expect(sut.execute(makeInput())).rejects.toThrow(ResourceNotFound);
		expect(fileStorageGateway.createPOST).not.toHaveBeenCalled();
		expect(scanRepository.create).not.toHaveBeenCalled();
	});

	it('should return the scan id and the upload signature', async () => {
		const { sut } = makeSut();

		const output = await sut.execute(makeInput());

		expect(output.scanId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
		expect(output.uploadSignature).toBe(UPLOAD_SIGNATURE);
	});

	it('should sign the upload for the key the scan will be stored under', async () => {
		const { sut, fileStorageGateway } = makeSut();

		const { scanId } = await sut.execute(makeInput());

		expect(fileStorageGateway.createPOST).toHaveBeenCalledWith({
			key: FileStorageGateway.getScanKey({ accountId: ACCOUNT_ID, scanId }),
			contentType: 'image/jpeg',
			maxSizeInBytes: 10 * 1024 * 1024
		});
	});

	it('should create the scan pending, with no draft and no attempt', async () => {
		const { sut, scanRepository } = makeSut();

		const { scanId } = await sut.execute(makeInput());

		const [{ scan }] = scanRepository.create.mock.calls[0]!;

		expect(scan).toMatchObject({
			id: scanId,
			accountId: ACCOUNT_ID,
			merchantId: MERCHANT_ID,
			status: Scan.Status.PENDING,
			provider: Scan.Provider.OPENAI,
			draft: null,
			ocrS3Key: null,
			purchaseId: null,
			errorCode: null,
			attempts: 0
		});
	});

	it('should set the ttl thirty days ahead, in epoch seconds', async () => {
		const { sut, scanRepository } = makeSut();

		await sut.execute(makeInput());

		const [{ scan }] = scanRepository.create.mock.calls[0]!;

		expect(scan.ttl).toBe(
			Math.floor(NOW.getTime() / 1000) + THIRTY_DAYS_IN_SECONDS
		);
	});

	it('should sign the upload before writing the scan', async () => {
		const { sut, scanRepository, fileStorageGateway } = makeSut();

		await sut.execute(makeInput());

		expect(
			fileStorageGateway.createPOST.mock.invocationCallOrder[0]!
		).toBeLessThan(scanRepository.create.mock.invocationCallOrder[0]!);
	});
});
