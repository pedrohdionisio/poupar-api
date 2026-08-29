import { Scan } from '@application/entities/Scan';
import z from 'zod';

export const listScansQuerySchema = z.object({
	status: z.enum(Scan.Status).optional(),
	limit: z.coerce.number().int().positive().max(100).optional()
});

export type ListScansQuery = z.infer<typeof listScansQuerySchema>;
