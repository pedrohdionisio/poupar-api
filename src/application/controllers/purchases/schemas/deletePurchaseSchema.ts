import z from 'zod';

export const deletePurchaseParamsSchema = z.object({
	purchasedAt: z.iso.datetime(),
	purchaseId: z.ulid()
});

export type DeletePurchaseParams = z.infer<typeof deletePurchaseParamsSchema>;
