import { Scan } from '@application/entities/Scan';
import { ScanItem } from '@infra/database/dynamo/items/ScanItem';
import { makeScan } from '@test/factories/makeScan';
import { makeScanDraft } from '@test/factories/makeScanDraft';
import { ACCOUNT_ID, MERCHANT_ID, PURCHASE_ID, SCAN_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

describe('ScanItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(ScanItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should key the scan by its ULID', () => {
		expect(ScanItem.getSK({ id: SCAN_ID })).toBe(`SCAN#${SCAN_ID}`);
	});

	it('should list scans of the account by prefix', () => {
		expect(ScanItem.getSKPrefix()).toBe('SCAN#');
	});

	it('should sort scans from the oldest to the newest, following the ULID', () => {
		const keys = [
			ScanItem.getSK({ id: '01JQN2B5D3K8W6YFHM9NRV7TQS' }),
			ScanItem.getSK({ id: '01JQMZ8K3P7X2VNBHR4TQWY5DC' })
		];

		expect([...keys].sort()).toEqual([keys[1], keys[0]]);
	});
});

describe('ScanItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = ScanItem.fromEntity({ entity: makeScan() }).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: `SCAN#${SCAN_ID}`,
			type: 'Scan',
			id: SCAN_ID,
			accountId: ACCOUNT_ID,
			merchantId: MERCHANT_ID,
			status: Scan.Status.AWAITING_REVIEW,
			photoS3Key: `scans/${ACCOUNT_ID}/${SCAN_ID}/photo.jpg`,
			ocrS3Key: `scans/${ACCOUNT_ID}/${SCAN_ID}/ocr.json`,
			provider: Scan.Provider.OPENAI,
			draft: makeScanDraft(),
			purchaseId: null,
			errorCode: null,
			attempts: 1,
			ttl: 1_800_000_000,
			createdAt: '2026-02-19T18:00:00.000Z',
			updatedAt: '2026-02-19T18:01:00.000Z'
		});
	});

	it('should keep the ttl as an epoch in seconds', () => {
		const item = ScanItem.fromEntity({ entity: makeScan() }).toItem();

		expect(Number.isInteger(item.ttl)).toBe(true);
		expect(item.ttl).toBe(1_800_000_000);
	});

	it('should store the status and the error code as enum strings', () => {
		const item = ScanItem.fromEntity({
			entity: makeScan({
				status: Scan.Status.FAILED,
				draft: null,
				errorCode: Scan.ErrorCode.DUPLICATE_RECEIPT,
				purchaseId: PURCHASE_ID
			})
		}).toItem();

		expect(item.status).toBe('FAILED');
		expect(item.errorCode).toBe('DUPLICATE_RECEIPT');
	});
});

describe('ScanItem round trip', () => {
	it('should rebuild the same scan', () => {
		const scan = makeScan();

		const item = ScanItem.fromEntity({ entity: scan }).toItem();

		expect(ScanItem.toEntity({ item })).toStrictEqual(scan);
	});

	it('should rebuild a pending scan that has no draft yet', () => {
		const scan = makeScan({
			status: Scan.Status.PENDING,
			ocrS3Key: null,
			draft: null,
			attempts: 0
		});

		const item = ScanItem.fromEntity({ entity: scan }).toItem();

		expect(ScanItem.toEntity({ item })).toStrictEqual(scan);
	});

	it('should preserve the whole draft, item by item', () => {
		const scan = makeScan();

		const item = ScanItem.fromEntity({ entity: scan }).toItem();
		const entity = ScanItem.toEntity({ item });

		expect(entity.draft).toStrictEqual(makeScanDraft());
	});

	it('should rebuild a scan that failed after being imported', () => {
		const scan = makeScan({
			status: Scan.Status.FAILED,
			draft: null,
			errorCode: Scan.ErrorCode.DUPLICATE_RECEIPT,
			purchaseId: PURCHASE_ID,
			attempts: 3
		});

		const item = ScanItem.fromEntity({ entity: scan }).toItem();

		expect(ScanItem.toEntity({ item })).toStrictEqual(scan);
	});
});
