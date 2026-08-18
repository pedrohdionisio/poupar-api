import { Account } from '@application/entities/Account';
import z from 'zod';

export const signUpSchema = z.object({
	name: z.string().min(1, '"name is required"'),
	email: z.email('"email is invalid"'),
	password: z.string().min(8, '"password" must have at least 8 characters '),
	role: z.enum(Account.Role)
});

export type SignUpBody = z.infer<typeof signUpSchema>;
