import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ResetPasswordCodeWrong extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 400;

	constructor() {
		super();

		this.name = 'ResetPasswordCodeWrong';
		this.message = 'Reset password code is wrong';
		this.code = ErrorCode.RESET_PASSWORD_CODE_WRONG;
	}
}
