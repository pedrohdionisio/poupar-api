import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';
import z from 'zod';

export const createPurchaseBodySchema = z.object({
	purchasedAt: z.iso.datetime(),
	merchantCnpj: z
		.string()
		.regex(/^\d{14}$/, '"merchantCnpj" must have exactly 14 digits'),
	merchantName: z.string().min(1, '"merchantName" is required'),
	category: z.enum(Merchant.Category),
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0),
	itemCount: z.int().nonnegative(),
	accessKey: z
		.string()
		.length(44, '"accessKey" must have exactly 44 characters')
		.nullish()
		.default(null),
	source: z.enum(Purchase.Source)
});

export type CreatePurchaseBody = z.infer<typeof createPurchaseBodySchema>;
