import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';
import { Receipt } from '@application/entities/Receipt';
import z from 'zod';

const importPurchaseMerchantSchema = z.object({
	cnpj: z
		.string()
		.regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
		.refine(
			(cnpj) => Merchant.isValidCnpj({ cnpj }),
			'"cnpj" has invalid check digits'
		),
	name: z.string().min(1, '"name" is required'),
	fantasyName: z
		.string()
		.min(1, '"fantasyName" cannot be empty')
		.nullish()
		.default(null),
	address: z.string().min(1, '"address" is required')
});

const importPurchaseItemSchema = z.object({
	seq: z.int().nonnegative(),
	description: z.string().min(1, '"description" is required'),
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
	merchant: importPurchaseMerchantSchema,
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0),
	items: z
		.array(importPurchaseItemSchema)
		.min(1, '"items" must have at least one item')
});

export type ImportPurchaseBody = z.infer<typeof importPurchaseBodySchema>;
