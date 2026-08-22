import { Merchant } from '@application/entities/Merchant';
import z from 'zod';

export const updateMerchantBodySchema = z.object({
	name: z.string().min(1, '"name" is required'),
	fantasyName: z
		.string()
		.min(1, '"fantasyName" cannot be empty')
		.nullish()
		.default(null),
	category: z.enum(Merchant.Category),
	address: z.string().min(1, '"address" is required')
});

export const updateMerchantParamsSchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits')
});

export type UpdateMerchantParams = z.infer<typeof updateMerchantParamsSchema>;

export type UpdateMerchantBody = z.infer<typeof updateMerchantBodySchema>;
