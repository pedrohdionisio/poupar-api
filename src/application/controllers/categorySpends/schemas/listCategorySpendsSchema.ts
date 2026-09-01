import z from 'zod';

const monthSchema = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must follow the "YYYY-MM" format');

export const listCategorySpendsQuerySchema = z
	.object({
		from: monthSchema,
		to: monthSchema
	})
	.refine((query) => query.from <= query.to, {
		message: '"from" must not be after "to"',
		path: ['from']
	});

export type ListCategorySpendsQuery = z.infer<
	typeof listCategorySpendsQuerySchema
>;
