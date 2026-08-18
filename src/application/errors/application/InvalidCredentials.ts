import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class InvalidCredentials extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 401;

	constructor() {
		super();

		this.name = 'InvalidCredentials';
		this.message = 'Invalid Credentials';
		this.code = ErrorCode.INVALID_CREDENTIALS;
	}
}
