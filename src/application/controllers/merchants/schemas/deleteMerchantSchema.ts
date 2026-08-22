import z from 'zod';

export const deleteMerchantParamsSchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
});

export type DeleteMerchantParams = z.infer<typeof deleteMerchantParamsSchema>;
