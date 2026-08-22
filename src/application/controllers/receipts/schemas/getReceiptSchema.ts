import z from 'zod';

export const getReceiptParamsSchema = z.object({
	purchaseId: z.ulid()
});

export type GetReceiptParams = z.infer<typeof getReceiptParamsSchema>;
