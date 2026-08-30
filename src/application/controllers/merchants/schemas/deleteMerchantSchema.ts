import z from 'zod';

export const deleteMerchantParamsSchema = z.object({
	merchantId: z.ulid()
});

export type DeleteMerchantParams = z.infer<typeof deleteMerchantParamsSchema>;
