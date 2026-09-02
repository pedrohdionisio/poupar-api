import { Receipt } from '@application/entities/Receipt';
import { ReceiptItem } from '@infra/database/dynamo/items/ReceiptItem';
import { makeReceipt } from '@test/factories/makeReceipt';
import { makeReceiptItem } from '@test/factories/makeReceiptItem';
import { ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

describe('ReceiptItem.keys', () => {
	it('should live in the partition of its own account', () => {
		expect(ReceiptItem.getPK({ accountId: ACCOUNT_ID })).toBe(
			`ACCOUNT#${ACCOUNT_ID}`
		);
	});

	it('should key the receipt by the purchase it belongs to', () => {
		expect(ReceiptItem.getSK({ purchaseId: PURCHASE_ID })).toBe(
			`RECEIPT#${PURCHASE_ID}`
		);
	});
});

describe('ReceiptItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = ReceiptItem.fromEntity({ entity: makeReceipt() }).toItem();

		expect(item).toStrictEqual({
			PK: `ACCOUNT#${ACCOUNT_ID}`,
			SK: `RECEIPT#${PURCHASE_ID}`,
			type: 'Receipt',
			purchaseId: PURCHASE_ID,
			accountId: ACCOUNT_ID,
			accessKey: '3'.repeat(44),
			photoS3Key: `scans/${ACCOUNT_ID}/photo.jpg`,
			ocrS3Key: `scans/${ACCOUNT_ID}/ocr.json`,
			items: [makeReceiptItem()],
			createdAt: '2026-02-19T18:00:00.000Z'
		});
	});

	it('should not carry an updated date, since the receipt is immutable', () => {
		const item = ReceiptItem.fromEntity({ entity: makeReceipt() }).toItem();

		expect(item).not.toHaveProperty('updatedAt');
	});
});

describe('ReceiptItem round trip', () => {
	it('should rebuild the same receipt', () => {
		const receipt = makeReceipt();

		const item = ReceiptItem.fromEntity({ entity: receipt }).toItem();

		expect(ReceiptItem.toEntity({ item })).toStrictEqual(receipt);
	});

	it('should rebuild a manual receipt without files or access key', () => {
		const receipt = makeReceipt({
			accessKey: null,
			photoS3Key: null,
			ocrS3Key: null
		});

		const item = ReceiptItem.fromEntity({ entity: receipt }).toItem();

		expect(ReceiptItem.toEntity({ item })).toStrictEqual(receipt);
	});

	it('should preserve every item of the basket untouched', () => {
		const receipt = makeReceipt({
			items: [
				makeReceiptItem({ seq: 1 }),
				makeReceiptItem({
					seq: 2,
					gtin: null,
					merchantCode: null,
					unit: Receipt.Unit.KG,
					quantityMilli: 384,
					unitPriceCents: 3990,
					totalCents: 1532,
					discountCents: 100
				})
			]
		});

		const item = ReceiptItem.fromEntity({ entity: receipt }).toItem();
		const entity = ReceiptItem.toEntity({ item });

		expect(entity.items).toStrictEqual(receipt.items);
		expect(entity.items[1]).toMatchObject({
			gtin: null,
			quantityMilli: 384,
			totalCents: 1532
		});
	});
});
