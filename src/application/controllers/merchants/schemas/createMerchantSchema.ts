import { Merchant } from '@application/entities/Merchant';
import z from 'zod';

export const createMerchantBodySchema = z.object({
	cnpj: z.string().regex(/^\d{14}$/, '"cnpj" must have exactly 14 digits'),
	name: z.string().min(1, '"name" is required'),
	fantasyName: z
		.string()
		.min(1, '"fantasyName" cannot be empty')
		.nullish()
		.default(null),
	category: z.enum(Merchant.Category),
	address: z.string().min(1, '"address" is required')
});

export type CreateMerchantBody = z.infer<typeof createMerchantBodySchema>;
