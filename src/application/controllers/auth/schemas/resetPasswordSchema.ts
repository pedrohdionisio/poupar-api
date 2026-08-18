import z from 'zod';

export const resetPasswordSchema = z.object({
	email: z.string().min(1, '"email" is required').email('"email" is invalid'),
	code: z.string().min(6, '"code" must have 6 characters'),
	password: z.string().min(1, '"password" is required')
});

export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
