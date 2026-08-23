import type { ErrorCode } from '@application/errors/ErrorCode';

interface ILambdaErrorResponseParams {
	statusCode: number;
	code: ErrorCode;
	message: any;
	details?: Record<string, unknown>;
}

export function lambdaErrorResponse({
	code,
	message,
	statusCode,
	details
}: ILambdaErrorResponseParams) {
	return {
		statusCode,
		body: JSON.stringify({
			error: {
				code,
				message,
				...(details && { details })
			}
		})
	};
}
