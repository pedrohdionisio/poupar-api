import { Receipt } from '@application/entities/Receipt';
import z from 'zod';

const confirmScanItemSchema = z.object({
	seq: z.int().nonnegative(),
	description: z.string().min(1, '"description" is required'),
	displayName: z
		.string()
		.min(1, '"displayName" cannot be empty')
		.nullish()
		.default(null),
	category: z
		.enum(Receipt.ProductCategory)
		.default(Receipt.ProductCategory.OTHER),
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

export const confirmScanParamsSchema = z.object({
	scanId: z.ulid()
});

export const confirmScanBodySchema = z.object({
	purchasedAt: z.iso.datetime(),
	accessKey: z
		.string()
		.length(44, '"accessKey" must have exactly 44 characters')
		.nullish()
		.default(null),
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0),
	items: z
		.array(confirmScanItemSchema)
		.min(1, '"items" must have at least one item')
});

export type ConfirmScanParams = z.infer<typeof confirmScanParamsSchema>;

export type ConfirmScanBody = z.infer<typeof confirmScanBodySchema>;
