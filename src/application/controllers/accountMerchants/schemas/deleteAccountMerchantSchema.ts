import z from 'zod';

export const deleteAccountMerchantParamsSchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
});

export type DeleteAccountMerchantParams = z.infer<
	typeof deleteAccountMerchantParamsSchema
>;
