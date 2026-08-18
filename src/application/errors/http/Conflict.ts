import { ErrorCode } from '../ErrorCode';
import { HttpError } from './HttpError';

export class Conflict extends HttpError {
	public override statusCode = 400;

	public override code: ErrorCode;

	constructor(message?: any, code?: ErrorCode) {
		super();

		this.name = 'Conflict';
		this.message = message ?? 'Conflict';
		this.code = code ?? ErrorCode.CONFLICT;
	}
}
