import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ReceiptNotParsed extends ApplicationError {
	public override code: ErrorCode;

	constructor() {
		super();

		this.name = 'ReceiptNotParsed';
		this.message = 'The extracted receipt does not match the expected shape.';
		this.code = ErrorCode.VALIDATION;
	}
}
