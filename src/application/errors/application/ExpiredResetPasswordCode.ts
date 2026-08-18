import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ExpiredResetPasswordCode extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 400;

	constructor() {
		super();

		this.name = 'ExpiredResetPasswordCode';
		this.message = 'Reset password code is expired';
		this.code = ErrorCode.EXPIRED_PASSWORD_CODE;
	}
}
