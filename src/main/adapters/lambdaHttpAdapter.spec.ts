import type { Controller } from '@application/contracts/Controller';
import { ReceiptAlreadyImported } from '@application/errors/application/ReceiptAlreadyImported';
import { ReceiptNotParsed } from '@application/errors/application/ReceiptNotParsed';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ErrorCode } from '@application/errors/ErrorCode';
import { Conflict } from '@application/errors/http/Conflict';
import { Forbbiden } from '@application/errors/http/Forbbiden';
import { Unauthorized } from '@application/errors/http/Unauthorized';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import {
	makeAuthorizedHttpEvent,
	makeHttpEvent
} from '@test/factories/makeHttpEvent';
import { ACCOUNT_ID, PURCHASE_ID } from '@test/fixtures';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import z from 'zod';

type ControllerExecute = (
	request: Controller.Request<'private'>
) => Promise<Controller.Response<unknown>>;

type ControllerStub = { execute: Mock<ControllerExecute> };

function makeController(
	execute: ControllerExecute = async () => ({
		statusCode: 200,
		body: { ok: true }
	})
): ControllerStub {
	return { execute: vi.fn(execute) };
}

function makeFailingController(error: unknown) {
	return makeController(async () => {
		throw error;
	});
}

async function run(controller: ControllerStub, event = makeHttpEvent()) {
	return (await lambdaHttpAdapter(
		controller as unknown as Controller<'private', unknown>
	)(event)) as APIGatewayProxyStructuredResultV2;
}

function parseBody(response: APIGatewayProxyStructuredResultV2) {
	return JSON.parse(response.body!);
}

describe('lambdaHttpAdapter request', () => {
	it('should hand the parsed request to the controller', async () => {
		const controller = makeController();

		await run(
			controller,
			makeHttpEvent({
				body: '{"totalCents":2500}',
				pathParameters: { purchaseId: PURCHASE_ID },
				queryStringParameters: { limit: '10' },
				headers: { authorization: 'token' }
			})
		);

		expect(controller.execute).toHaveBeenCalledWith({
			body: { totalCents: 2500 },
			params: { purchaseId: PURCHASE_ID },
			queryParams: { limit: '10' },
			headers: { authorization: 'token' },
			accountId: null
		});
	});

	it('should default the missing parts of the request', async () => {
		const controller = makeController();

		await run(controller);

		expect(controller.execute).toHaveBeenCalledWith(
			expect.objectContaining({ body: {}, params: {}, queryParams: {} })
		);
	});

	it('should take the account id from the authorizer claims', async () => {
		const controller = makeController();

		await run(controller, makeAuthorizedHttpEvent(ACCOUNT_ID));

		expect(controller.execute).toHaveBeenCalledWith(
			expect.objectContaining({ accountId: ACCOUNT_ID })
		);
	});
});

describe('lambdaHttpAdapter response', () => {
	it('should serialize the body returned by the controller', async () => {
		const response = await run(makeController());

		expect(response.statusCode).toBe(200);
		expect(parseBody(response)).toEqual({ ok: true });
	});

	it('should send no body when the controller returns none', async () => {
		const controller = makeController(vi.fn(async () => ({ statusCode: 204 })));

		const response = await run(controller);

		expect(response.statusCode).toBe(204);
		expect(response.body).toBeUndefined();
	});
});

describe('lambdaHttpAdapter error mapping', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
	});

	it('should turn a Zod error into a 400 listing every invalid field', async () => {
		const error = new z.ZodError([
			{ code: 'custom', path: ['items', 0, 'gtin'], message: 'invalid gtin' },
			{ code: 'custom', path: ['totalCents'], message: 'must be an integer' }
		]);
		const response = await run(makeFailingController(error));

		expect(response.statusCode).toBe(400);
		expect(parseBody(response).error).toEqual({
			code: ErrorCode.VALIDATION,
			message: [
				{ field: 'items.0.gtin', error: 'invalid gtin' },
				{ field: 'totalCents', error: 'must be an integer' }
			]
		});
	});

	it('should keep the status code of an HTTP error', async () => {
		const response = await run(
			makeFailingController(new Unauthorized('Invalid token.'))
		);

		expect(response.statusCode).toBe(401);
		expect(parseBody(response).error).toEqual({
			code: ErrorCode.UNAUTHORIZED,
			message: 'Invalid token.'
		});
	});

	it('should answer 403 when the route is not allowed for the account', async () => {
		const response = await run(
			makeFailingController(new Forbbiden('No permission.'))
		);

		expect(response.statusCode).toBe(403);
		expect(parseBody(response).error.code).toBe(ErrorCode.FORBIDDEN);
	});

	it('should answer 409 when the resource is in a conflicting state', async () => {
		const response = await run(
			makeFailingController(
				new Conflict('Scan is "DONE" and cannot be confirmed.')
			)
		);

		expect(response.statusCode).toBe(409);
		expect(parseBody(response).error.code).toBe(ErrorCode.CONFLICT);
	});

	it('should keep the status code of an application error', async () => {
		const response = await run(
			makeFailingController(new ResourceNotFound('Purchase not found.'))
		);

		expect(response.statusCode).toBe(404);
		expect(parseBody(response).error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
	});

	it('should fall back to 400 for an application error with no status code', async () => {
		const response = await run(makeFailingController(new ReceiptNotParsed()));

		expect(response.statusCode).toBe(400);
		expect(parseBody(response).error.code).toBe(ErrorCode.VALIDATION);
	});

	it('should forward the details of an application error', async () => {
		const response = await run(
			makeFailingController(new ReceiptAlreadyImported(PURCHASE_ID))
		);

		expect(response.statusCode).toBe(409);
		expect(parseBody(response).error.details).toEqual({
			purchaseId: PURCHASE_ID
		});
	});

	it('should turn a failed Dynamo condition into a 400', async () => {
		const response = await run(
			makeFailingController(
				new ConditionalCheckFailedException({
					message: 'The conditional request failed',
					$metadata: {}
				})
			)
		);

		expect(response.statusCode).toBe(400);
		expect(parseBody(response).error).toEqual({
			code: ErrorCode.BAD_REQUEST,
			message: 'Error on dynamo condition'
		});
	});

	it('should hide an unexpected error behind a 500', async () => {
		const response = await run(
			makeFailingController(new Error('connect ETIMEDOUT 10.0.0.1:443'))
		);

		expect(response.statusCode).toBe(500);
		expect(parseBody(response).error).toEqual({
			code: ErrorCode.INTERNAL_SERVER_ERROR,
			message: 'Internal server error.'
		});
	});

	it('should reject a malformed body before calling the controller', async () => {
		const controller = makeController();

		const response = await run(
			controller,
			makeHttpEvent({ body: '{"totalCents":' })
		);

		expect(response.statusCode).toBe(400);
		expect(parseBody(response).error.message).toBe('Malformed body.');
		expect(controller.execute).not.toHaveBeenCalled();
	});
});
