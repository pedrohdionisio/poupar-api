import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class UserNotFound extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 404;

	constructor() {
		super();

		this.name = 'UserNotFound';
		this.message = 'User not found';
		this.code = ErrorCode.USER_NOT_FOUND;
	}
}
