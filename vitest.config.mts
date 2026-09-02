import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.spec.ts'],
		setupFiles: [resolve('./vitest.setup.ts')],
		env: {
			COGNITO_CLIENT_ID: 'test-client-id',
			COGNITO_CLIENT_SECRET: 'test-client-secret',
			COGNITO_POOL_ID: 'test-pool-id',
			MAIN_TABLE_NAME: 'test-main-table',
			UPLOADS_BUCKET_NAME: 'test-uploads-bucket',
			OPENAI_API_KEY: 'test-openai-key',
			OPENAI_MODEL: 'test-openai-model'
		}
	},
	resolve: {
		alias: {
			'@application': resolve('./src/application'),
			'@infra': resolve('./src/infra'),
			'@kernel': resolve('./src/kernel'),
			'@main': resolve('./src/main'),
			'@shared': resolve('./src/shared'),
			'@test': resolve('./test')
		}
	}
});
