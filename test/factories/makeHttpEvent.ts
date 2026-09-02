import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyEventV2WithJWTAuthorizer
} from 'aws-lambda';

type MakeHttpEventParams = {
	body?: string | null;
	pathParameters?: Record<string, string> | undefined;
	queryStringParameters?: Record<string, string> | undefined;
	headers?: Record<string, string>;
};

export function makeHttpEvent({
	body = null,
	pathParameters,
	queryStringParameters,
	headers = {}
}: MakeHttpEventParams = {}): APIGatewayProxyEventV2 {
	return {
		body,
		pathParameters,
		queryStringParameters,
		headers,
		requestContext: {}
	} as APIGatewayProxyEventV2;
}

export function makeAuthorizedHttpEvent(
	internalId: string,
	params: MakeHttpEventParams = {}
): APIGatewayProxyEventV2WithJWTAuthorizer {
	return {
		...makeHttpEvent(params),
		requestContext: {
			authorizer: { jwt: { claims: { internalId } } }
		}
	} as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}
