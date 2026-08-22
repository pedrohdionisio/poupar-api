import z from 'zod';

export const listPricePointsQuerySchema = z.object({
	productKey: z
		.string()
		.regex(
			/^(GTIN#(\d{8}|\d{12,14})|MERCHANT#\d{14}#PROD#.+|NAME#[a-f0-9]{40})$/,
			'"productKey" must be GTIN#<gtin>, MERCHANT#<cnpj>#PROD#<code> or NAME#<sha1>'
		)
});

export type ListPricePointsQuery = z.infer<typeof listPricePointsQuerySchema>;
