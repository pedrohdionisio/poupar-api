import z from 'zod';

export const getScanParamsSchema = z.object({
	scanId: z.ulid()
});

export type GetScanParams = z.infer<typeof getScanParamsSchema>;
