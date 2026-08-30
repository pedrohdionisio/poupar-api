import z from 'zod';

export const listPricePointsQuerySchema = z.object({
	productKey: z
		.string()
		.regex(/^[a-f0-9]{40}$/, '"productKey" must be a 40 character sha1 hash')
});

export type ListPricePointsQuery = z.infer<typeof listPricePointsQuerySchema>;
