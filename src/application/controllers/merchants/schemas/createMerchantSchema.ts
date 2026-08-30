import { Merchant } from '@application/entities/Merchant';
import z from 'zod';

export const createMerchantBodySchema = z.object({
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

export type CreateMerchantBody = z.infer<typeof createMerchantBodySchema>;
