import z from 'zod';

export const getAccountMerchantParamsSchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
});

export type GetAccountMerchantParams = z.infer<
	typeof getAccountMerchantParamsSchema
>;
