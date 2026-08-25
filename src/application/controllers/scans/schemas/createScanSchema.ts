import z from 'zod';

export const createScanBodySchema = z.object({
	contentType: z.enum(['image/jpeg', 'image/png'])
});

export type CreateScanBody = z.infer<typeof createScanBodySchema>;
