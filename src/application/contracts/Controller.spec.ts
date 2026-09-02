import { Controller } from '@application/contracts/Controller';
import { Forbbiden } from '@application/errors/http/Forbbiden';
import { Unauthorized } from '@application/errors/http/Unauthorized';
import { AdminOnly } from '@kernel/decorators/AdminOnly';
import { Schema } from '@kernel/decorators/Schema';
import { makeJwt } from '@test/factories/makeJwt';
import { ACCOUNT_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';
import z from 'zod';

const bodySchema = z.object({
	totalCents: z.int().nonnegative(),
	discountCents: z.int().nonnegative().default(0)
});

const paramsSchema = z.object({ purchaseId: z.ulid() });

const querySchema = z.object({ limit: z.coerce.number().int().positive() });

class PlainController extends Controller<'private', unknown> {
	public received: unknown;

	protected override async handle(
		request: Controller.Request<'private'>
	): Promise<Controller.Response<unknown>> {
		this.received = request;

		return { statusCode: 200, body: { ok: true } };
	}
}

@Schema({ body: bodySchema, params: paramsSchema, query: querySchema })
class ValidatedController extends PlainController {}

@AdminOnly()
class AdminController extends PlainController {}

@Schema({ body: bodySchema })
@AdminOnly()
class AdminOnlyValidatedController extends PlainController {}

function makeRequest(
	overrides: Partial<Controller.Request<'private'>> = {}
): Controller.Request<'private'> {
	return {
		accountId: ACCOUNT_ID,
		body: {},
		params: {},
		queryParams: {},
		headers: {},
		...overrides
	};
}

describe('Controller validation', () => {
	it('should pass the request through when there is no schema', async () => {
		const sut = new PlainController();
		const request = makeRequest({ body: { anything: true } });

		const response = await sut.execute(request);

		expect(response).toEqual({ statusCode: 200, body: { ok: true } });
		expect(sut.received).toBe(request);
	});

	it('should hand the parsed body to the handler', async () => {
		const sut = new ValidatedController();

		await sut.execute(
			makeRequest({
				body: { totalCents: 2500 },
				params: { purchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF' },
				queryParams: { limit: '10' }
			})
		);

		expect(sut.received).toMatchObject({
			body: { totalCents: 2500, discountCents: 0 },
			params: { purchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF' },
			queryParams: { limit: 10 }
		});
	});

	it('should reject an invalid body before reaching the handler', async () => {
		const sut = new ValidatedController();

		await expect(
			sut.execute(
				makeRequest({
					body: { totalCents: -1 },
					params: { purchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF' },
					queryParams: { limit: '10' }
				})
			)
		).rejects.toThrow(z.ZodError);
		expect(sut.received).toBeUndefined();
	});

	it('should reject invalid params', async () => {
		const sut = new ValidatedController();

		await expect(
			sut.execute(
				makeRequest({
					body: { totalCents: 2500 },
					params: { purchaseId: 'not-a-ulid' },
					queryParams: { limit: '10' }
				})
			)
		).rejects.toThrow(z.ZodError);
	});

	it('should reject invalid query params', async () => {
		const sut = new ValidatedController();

		await expect(
			sut.execute(
				makeRequest({
					body: { totalCents: 2500 },
					params: { purchaseId: '01JQN12X8Q5R3WPKD6HYT4NBCF' },
					queryParams: { limit: '0' }
				})
			)
		).rejects.toThrow(z.ZodError);
	});
});

describe('Controller authorization', () => {
	it('should let an admin through', async () => {
		const sut = new AdminController();

		const response = await sut.execute(
			makeRequest({
				headers: { authorization: makeJwt({ groups: ['admins'] }) }
			})
		);

		expect(response.statusCode).toBe(200);
	});

	it('should refuse a request with no authorization header', async () => {
		const sut = new AdminController();

		await expect(sut.execute(makeRequest())).rejects.toThrow(Unauthorized);
	});

	it('should reject instead of throwing synchronously', async () => {
		const sut = new AdminController();

		const promise = sut.execute(makeRequest());

		await expect(promise).rejects.toThrow(Unauthorized);
	});

	it('should refuse a user that is not in the admins group', async () => {
		const sut = new AdminController();

		await expect(
			sut.execute(
				makeRequest({
					headers: { authorization: makeJwt({ groups: ['users'] }) }
				})
			)
		).rejects.toThrow(Forbbiden);
	});

	it('should refuse a token with no groups claim', async () => {
		const sut = new AdminController();

		await expect(
			sut.execute(makeRequest({ headers: { authorization: makeJwt() } }))
		).rejects.toThrow(Forbbiden);
	});

	it('should authorize before validating the request', async () => {
		const sut = new AdminOnlyValidatedController();

		await expect(
			sut.execute(makeRequest({ body: { totalCents: -1 } }))
		).rejects.toThrow(Unauthorized);
	});

	it('should ignore the authorization header when the route is not admin only', async () => {
		const sut = new PlainController();

		const response = await sut.execute(makeRequest());

		expect(response.statusCode).toBe(200);
	});
});
