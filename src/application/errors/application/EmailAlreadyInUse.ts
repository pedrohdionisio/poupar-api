import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class EmailAlreadyInUse extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 409;

	constructor() {
		super();

		this.name = 'EmailAlreadyInUse';
		this.message = 'This email is already in use';
		this.code = ErrorCode.BAD_REQUEST;
	}
}
