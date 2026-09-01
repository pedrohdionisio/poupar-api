import { Receipt } from '@application/entities/Receipt';
import z from 'zod';

export const updateAccountProductCategoryParamsSchema = z.object({
	productKey: z
		.string()
		.regex(/^[a-f0-9]{40}$/, '"productKey" must be a 40 character sha1 hash')
});

export const updateAccountProductCategoryBodySchema = z.object({
	category: z.enum(Receipt.ProductCategory)
});

export type UpdateAccountProductCategoryParams = z.infer<
	typeof updateAccountProductCategoryParamsSchema
>;

export type UpdateAccountProductCategoryBody = z.infer<
	typeof updateAccountProductCategoryBodySchema
>;
