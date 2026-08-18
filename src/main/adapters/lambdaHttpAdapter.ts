import type { Controller } from '@application/contracts/Controller';
import { ApplicationError } from '@application/errors/application/ApplicationError';
import { ErrorCode } from '@application/errors/ErrorCode';
import { HttpError } from '@application/errors/http/HttpError';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { lambdaBodyParser } from '@main/utils/lambdaBodyParser';
import { lambdaErrorResponse } from '@main/utils/lambdaErrorResponse';
import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyEventV2WithJWTAuthorizer,
	APIGatewayProxyResultV2
} from 'aws-lambda';
import { ZodError } from 'zod';

export function lambdaHttpAdapter(controller: Controller<any, unknown>) {
	return async (
		event: APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer
	): Promise<APIGatewayProxyResultV2> => {
		try {
			const body = lambdaBodyParser(event.body);
			const params = event.pathParameters ?? {};
			const queryParams = event.queryStringParameters ?? {};
			const headers = event.headers ?? {};
			const accountId =
				'authorizer' in event.requestContext
					? (event.requestContext.authorizer.jwt.claims.internalId as string)
					: null;

			const response = await controller.execute({
				body,
				params,
				queryParams,
				accountId,
				headers
			});

			return {
				statusCode: response.statusCode,
				body: response.body ? JSON.stringify(response.body) : undefined
			};
		} catch (error) {
			if (error instanceof ZodError) {
				return lambdaErrorResponse({
					statusCode: 400,
					code: ErrorCode.VALIDATION,
					message: error.issues.map((issue) => ({
						field: issue.path.join('.'),
						error: issue.message
					}))
				});
			}

			if (error instanceof HttpError) {
				return lambdaErrorResponse(error);
			}

			if (error instanceof ApplicationError) {
				return lambdaErrorResponse({
					code: error.code,
					message: error.message,
					statusCode: error.statusCode ?? 400
				});
			}

			if (error instanceof ConditionalCheckFailedException) {
				return lambdaErrorResponse({
					code: ErrorCode.BAD_REQUEST,
					message: 'Error on dynamo condition',
					statusCode: 400
				});
			}

			// biome-ignore lint/suspicious/noConsole: <>
			console.log(error);

			return lambdaErrorResponse({
				statusCode: 500,
				code: ErrorCode.INTERNAL_SERVER_ERROR,
				message: 'Internal server error.'
			});
		}
	};
}
