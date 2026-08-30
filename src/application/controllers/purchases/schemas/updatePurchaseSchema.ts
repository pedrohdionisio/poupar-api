import z from 'zod';

export const updatePurchaseBodySchema = z.object({
	merchantId: z.ulid(),
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
