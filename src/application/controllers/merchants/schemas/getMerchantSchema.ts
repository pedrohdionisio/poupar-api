import z from 'zod';

export const getMerchantParamsSchema = z.object({
	merchantId: z.ulid()
});

export type GetMerchantParams = z.infer<typeof getMerchantParamsSchema>;
