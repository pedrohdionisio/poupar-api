import { Account } from '@application/entities/Account';
import z from 'zod';

export const updateAccountBodySchema = z.object({
	name: z.string().min(1, '"name" is required'),
	role: z.enum(Account.Role)
});

export const updateAccountParamsSchema = z.object({
	accountId: z.ulid()
});

export type UpdateAccountParams = z.infer<typeof updateAccountParamsSchema>;

export type UpdateAccountBody = z.infer<typeof updateAccountBodySchema>;
