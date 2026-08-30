import { Merchant } from '@application/entities/Merchant';
import z from 'zod';

export const updateMerchantBodySchema = z.object({
	name: z.string().min(1, '"name" is required'),
	category: z.enum(Merchant.Category),
	cnpj: z
		.string()
		.regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
		.refine(
			(cnpj) => Merchant.isValidCnpj({ cnpj }),
			'"cnpj" has invalid check digits'
		)
		.nullish()
		.default(null)
});

export const updateMerchantParamsSchema = z.object({
	merchantId: z.ulid()
});

export type UpdateMerchantParams = z.infer<typeof updateMerchantParamsSchema>;

export type UpdateMerchantBody = z.infer<typeof updateMerchantBodySchema>;
