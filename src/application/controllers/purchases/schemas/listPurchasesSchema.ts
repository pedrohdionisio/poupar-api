import z from 'zod';

export const listPurchasesQuerySchema = z
	.object({
		from: z.iso.datetime().optional(),
		to: z.iso.datetime().optional(),
		limit: z.coerce.number().int().positive().max(100).optional()
	})
	.refine((query) => Boolean(query.from) === Boolean(query.to), {
		message: '"from" and "to" must be provided together',
		path: ['to']
	});

export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
