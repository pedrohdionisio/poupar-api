import { Purchase } from '@application/entities/Purchase';
import { Receipt } from '@application/entities/Receipt';
import z from 'zod';

const importPurchaseItemSchema = z.object({
	seq: z.int().nonnegative(),
	description: z.string().min(1, '"description" is required'),
	displayName: z
		.string()
		.min(1, '"displayName" cannot be empty')
		.nullish()
		.default(null),
	merchantCode: z
		.string()
		.min(1, '"merchantCode" cannot be empty')
		.nullish()
		.default(null),
	gtin: z
		.string()
		.regex(/^(\d{8}|\d{12,14})$/, '"gtin" must have 8, 12, 13 or 14 digits')
		.nullish()
		.default(null),
	quantityMilli: z.int().positive(),
	unit: z.enum(Receipt.Unit),
	unitPriceCents: z.int().nonnegative(),
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0)
});

export const importPurchaseBodySchema = z.object({
	source: z.enum(Purchase.Source),
	purchasedAt: z.iso.datetime(),
	accessKey: z
		.string()
		.length(44, '"accessKey" must have exactly 44 characters')
		.nullish()
		.default(null),
	photoS3Key: z
		.string()
		.min(1, '"photoS3Key" cannot be empty')
		.nullish()
		.default(null),
	ocrS3Key: z
		.string()
		.min(1, '"ocrS3Key" cannot be empty')
		.nullish()
		.default(null),
	merchantId: z.ulid(),
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0),
	items: z
		.array(importPurchaseItemSchema)
		.min(1, '"items" must have at least one item')
});

export type ImportPurchaseBody = z.infer<typeof importPurchaseBodySchema>;
