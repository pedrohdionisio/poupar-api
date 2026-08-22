import { Receipt } from '@application/entities/Receipt';
import z from 'zod';

const receiptItemSchema = z.object({
	seq: z.int().nonnegative(),
	productKey: z.string().min(1, '"productKey" is required'),
	description: z.string().min(1, '"description" is required'),
	normalizedName: z.string().min(1, '"normalizedName" is required'),
	gtin: z
		.string()
		.regex(/^(\d{8}|\d{12,14})$/, '"gtin" must have 8, 12, 13 or 14 digits')
		.nullish()
		.default(null),
	merchantCode: z
		.string()
		.min(1, '"merchantCode" is required')
		.nullish()
		.default(null),
	quantityMilli: z.int().positive(),
	unit: z.enum(Receipt.Unit),
	unitPriceCents: z.int().nonnegative(),
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0)
});

export const createReceiptBodySchema = z.object({
	purchasedAt: z.iso.datetime(),
	accessKey: z
		.string()
		.length(44, '"accessKey" must have exactly 44 characters')
		.nullish()
		.default(null),
	photoS3Key: z.string().min(1, '"photoS3Key" is required'),
	ocrS3Key: z.string().min(1, '"ocrS3Key" is required').nullish().default(null),
	items: z
		.array(receiptItemSchema)
		.min(1, '"items" must have at least one item')
});

export const createReceiptParamsSchema = z.object({
	purchaseId: z.ulid()
});

export type CreateReceiptParams = z.infer<typeof createReceiptParamsSchema>;

export type CreateReceiptBody = z.infer<typeof createReceiptBodySchema>;
