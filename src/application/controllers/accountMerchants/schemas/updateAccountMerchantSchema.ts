import z from 'zod';

export const updateAccountMerchantBodySchema = z.object({
	alias: z.string().min(1, '"alias" cannot be empty').nullable()
});

export const updateAccountMerchantParamsSchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
});

export type UpdateAccountMerchantParams = z.infer<
	typeof updateAccountMerchantParamsSchema
>;

export type UpdateAccountMerchantBody = z.infer<
	typeof updateAccountMerchantBodySchema
>;
