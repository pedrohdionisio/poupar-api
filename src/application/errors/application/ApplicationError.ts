import type { ErrorCode } from '../ErrorCode';

export abstract class ApplicationError extends Error {
	public statusCode?: number;

	public details?: Record<string, unknown>;

	public abstract code: ErrorCode;
}
