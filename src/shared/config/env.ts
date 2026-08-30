import { z } from 'zod';

export const schema = z.object({
	// Cognito
	COGNITO_CLIENT_ID: z.string().min(1),
	COGNITO_CLIENT_SECRET: z.string().min(1),
	COGNITO_POOL_ID: z.string().min(1),

	// Database
	MAIN_TABLE_NAME: z.string().min(1),

	// Storage
	UPLOADS_BUCKET_NAME: z.string().min(1),

	// AI
	OPENAI_API_KEY: z.string().min(1),
	OPENAI_MODEL: z.string().min(1)
});

export const env = schema.parse(process.env);
