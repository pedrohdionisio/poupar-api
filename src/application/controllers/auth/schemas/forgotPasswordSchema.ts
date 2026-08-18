import z from 'zod';

export const forgotPasswordSchema = z.object({
	email: z.string().min(1, '"email" is required').email('"email" is invalid')
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
