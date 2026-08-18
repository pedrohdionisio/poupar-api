import { ErrorCode } from '../ErrorCode';
import { HttpError } from './HttpError';

export class Forbbiden extends HttpError {
	public override statusCode = 401;

	public override code: ErrorCode;

	constructor(message?: any, code?: ErrorCode) {
		super();

		this.name = 'Forbbiden';
		this.message = message ?? 'Forbbiden.';
		this.code = code ?? ErrorCode.FORBIDDEN;
	}
}
