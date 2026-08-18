import z from 'zod';

export const signInSchema = z.object({
	email: z.string().min(1, '"email" is required').email('"email" is invalid'),
	password: z.string().min(8, '"password" must have at least 8 characters ')
});

export type SignInBody = z.infer<typeof signInSchema>;
