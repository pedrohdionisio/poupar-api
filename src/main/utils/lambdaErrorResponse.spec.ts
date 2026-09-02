import { ErrorCode } from '@application/errors/ErrorCode';
import { lambdaErrorResponse } from '@main/utils/lambdaErrorResponse';
import { describe, expect, it } from 'vitest';

describe('lambdaErrorResponse', () => {
	it('should wrap the code and the message under an "error" key', () => {
		const response = lambdaErrorResponse({
			statusCode: 404,
			code: ErrorCode.RESOURCE_NOT_FOUND,
			message: 'Purchase not found.'
		});

		expect(response.statusCode).toBe(404);
		expect(JSON.parse(response.body)).toEqual({
			error: {
				code: ErrorCode.RESOURCE_NOT_FOUND,
				message: 'Purchase not found.'
			}
		});
	});

	it('should omit the details when there are none', () => {
		const response = lambdaErrorResponse({
			statusCode: 400,
			code: ErrorCode.BAD_REQUEST,
			message: 'Bad Request'
		});

		expect(JSON.parse(response.body).error).not.toHaveProperty('details');
	});

	it('should forward the details when there are any', () => {
		const response = lambdaErrorResponse({
			statusCode: 409,
			code: ErrorCode.RESOURCE_ALREADY_EXISTS,
			message: 'Receipt already imported.',
			details: { purchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF' }
		});

		expect(JSON.parse(response.body).error.details).toEqual({
			purchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF'
		});
	});

	it('should keep a list of field errors as the message', () => {
		const response = lambdaErrorResponse({
			statusCode: 400,
			code: ErrorCode.VALIDATION,
			message: [{ field: 'items.0.gtin', error: 'invalid' }]
		});

		expect(JSON.parse(response.body).error.message).toEqual([
			{ field: 'items.0.gtin', error: 'invalid' }
		]);
	});
});
