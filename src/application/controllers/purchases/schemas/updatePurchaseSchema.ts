import { Merchant } from '@application/entities/Merchant';
import z from 'zod';

export const updatePurchaseBodySchema = z.object({
	merchantCnpj: z
		.string()
		.regex(/^\d{14}$/, '"merchantCnpj" must have exactly 14 digits'),
	merchantName: z.string().min(1, '"merchantName" is required'),
	category: z.enum(Merchant.Category),
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative(),
	itemCount: z.int().nonnegative()
});

export const updatePurchaseParamsSchema = z.object({
	purchasedAt: z.iso.datetime(),
	purchaseId: z.ulid()
});

export type UpdatePurchaseParams = z.infer<typeof updatePurchaseParamsSchema>;

export type UpdatePurchaseBody = z.infer<typeof updatePurchaseBodySchema>;
