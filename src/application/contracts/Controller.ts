import { Account } from '@application/entities/Account';
import { Forbbiden } from '@application/errors/http/Forbbiden';
import { Unauthorized } from '@application/errors/http/Unauthorized';
import { isAdminOnly } from '@kernel/decorators/AdminOnly';
import { getSchema } from '@kernel/decorators/Schema';

type RouteType = 'public' | 'private';

export abstract class Controller<TType extends RouteType, TBody = undefined> {
	protected abstract handle(
		request: Controller.Request<TType>
	): Promise<Controller.Response<TBody>>;

	private validateRequest(request: Controller.Request<TType>) {
		const schema = getSchema(this);

		if (!schema) {
			return request;
		}

		return {
			...request,
			body: schema.body ? schema.body.parse(request.body) : request.body,
			params: schema.params
				? schema.params.parse(request.params)
				: request.params,
			queryParams: schema.query
				? schema.query.parse(request.queryParams)
				: request.queryParams
		};
	}

	public execute(
		request: Controller.Request<TType>
	): Promise<Controller.Response<TBody>> {
		if (isAdminOnly(this)) {
			this.validatePrivateRoute(request.headers);
		}

		const validated = this.validateRequest(request);

		return this.handle(validated);
	}

	private validatePrivateRoute(
		headers: Controller.Request<TType>['headers'],
		role: Account.Role = Account.Role.ADMIN
	) {
		if (!headers.authorization) {
			throw new Unauthorized('Invalid token.');
		}

		const [, payload] = headers.authorization.split('.');
		const claims = JSON.parse(
			Buffer.from(payload, 'base64url').toString('utf-8')
		);

		const userRoles: string[] = claims['cognito:groups'] ?? [];

		if (role === Account.Role.ADMIN && !userRoles.includes('admins')) {
			throw new Forbbiden("You don't have permission to perform this action.");
		}
	}
}

export namespace Controller {
	type BaseRequest<
		TBody = Record<string, unknown>,
		TParams = Record<string, unknown>,
		TQueryParams = Record<string, unknown>
	> = {
		body: TBody;
		params: TParams;
		queryParams: TQueryParams;
		headers: {
			authorization?: string;
		};
	};

	type PublicRequest<
		TBody = Record<string, unknown>,
		TParams = Record<string, unknown>,
		TQueryParams = Record<string, unknown>
	> = BaseRequest<TBody, TParams, TQueryParams> & {
		accountId: null;
	};

	type PrivateRequest<
		TBody = Record<string, unknown>,
		TParams = Record<string, unknown>,
		TQueryParams = Record<string, unknown>
	> = BaseRequest<TBody, TParams, TQueryParams> & {
		accountId: string;
	};

	export type Request<
		TType extends RouteType,
		TBody = Record<string, unknown>,
		TParams = Record<string, unknown>,
		TQueryParams = Record<string, unknown>
	> = TType extends 'public'
		? PublicRequest<TBody, TParams, TQueryParams>
		: PrivateRequest<TBody, TParams, TQueryParams>;

	export type Response<TBody = undefined> = {
		statusCode: number;
		body?: TBody;
	};
}
