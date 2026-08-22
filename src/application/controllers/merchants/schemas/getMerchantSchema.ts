import z from 'zod';

export const getMerchantParamsSchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
});

export type GetMerchantParams = z.infer<typeof getMerchantParamsSchema>;
