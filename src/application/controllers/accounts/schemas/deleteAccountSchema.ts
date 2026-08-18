import z from 'zod';

export const deleteAccountSchema = z.object({
	accountId: z.ulid()
});

export type DeleteAccountParams = z.infer<typeof deleteAccountSchema>;
