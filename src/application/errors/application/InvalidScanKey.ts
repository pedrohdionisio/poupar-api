import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class InvalidScanKey extends ApplicationError {
	public override code: ErrorCode;

	constructor(key: string) {
		super();

		this.name = 'InvalidScanKey';
		this.message = `"${key}" is not a valid scan key.`;
		this.code = ErrorCode.VALIDATION;
	}
}
