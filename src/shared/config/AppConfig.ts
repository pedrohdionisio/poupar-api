import { Injectable } from '@kernel/decorators/Injectable';
import { env } from './env';

@Injectable()
export class AppConfig {
	readonly auth: AppConfig.Auth;
	readonly database: AppConfig.Database;
	readonly storage: AppConfig.Storage;
	readonly ai: AppConfig.Ai;

	constructor() {
		this.auth = {
			cognito: {
				client: {
					id: env.COGNITO_CLIENT_ID,
					secret: env.COGNITO_CLIENT_SECRET
				},
				pool: {
					id: env.COGNITO_POOL_ID
				}
			}
		};

		this.database = {
			dynamodb: {
				mainTable: env.MAIN_TABLE_NAME
			}
		};

		this.storage = {
			s3: {
				uploadsBucket: env.UPLOADS_BUCKET_NAME
			}
		};

		this.ai = {
			gemini: {
				apiKey: env.GEMINI_API_KEY,
				model: env.GEMINI_MODEL
			}
		};
	}
}

export namespace AppConfig {
	export type Auth = {
		cognito: {
			client: {
				id: string;
				secret: string;
			};
			pool: {
				id: string;
			};
		};
	};

	export type Database = {
		dynamodb: {
			mainTable: string;
		};
	};

	export type Storage = {
		s3: {
			uploadsBucket: string;
		};
	};

	export type Ai = {
		gemini: {
			apiKey: string;
			model: string;
		};
	};
}
