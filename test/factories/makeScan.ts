import { Scan } from '@application/entities/Scan';
import { makeScanDraft } from '@test/factories/makeScanDraft';
import { ACCOUNT_ID, MERCHANT_ID, SCAN_ID } from '@test/fixtures';

export function makeScan(overrides: Partial<Scan.Attributes> = {}) {
	return new Scan({
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
		createdAt: new Date('2026-02-19T18:00:00.000Z'),
		updatedAt: new Date('2026-02-19T18:01:00.000Z'),
		...overrides
	});
}
