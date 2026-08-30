import z from 'zod';

export const createScanBodySchema = z.object({
	merchantId: z.ulid(),
	contentType: z.enum(['image/jpeg', 'image/png'])
});

export type CreateScanBody = z.infer<typeof createScanBodySchema>;
