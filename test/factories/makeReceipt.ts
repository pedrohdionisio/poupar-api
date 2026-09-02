import { Receipt } from '@application/entities/Receipt';
import { makeReceiptItem } from '@test/factories/makeReceiptItem';
import { ACCESS_KEY, ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';

export function makeReceipt(overrides: Partial<Receipt.Attributes> = {}) {
	return new Receipt({
		purchaseId: PURCHASE_ID,
		accountId: ACCOUNT_ID,
		accessKey: ACCESS_KEY,
		photoS3Key: `scans/${ACCOUNT_ID}/photo.jpg`,
		ocrS3Key: `scans/${ACCOUNT_ID}/ocr.json`,
		items: [makeReceiptItem()],
		createdAt: new Date('2026-02-19T18:00:00.000Z'),
		...overrides
	});
}
