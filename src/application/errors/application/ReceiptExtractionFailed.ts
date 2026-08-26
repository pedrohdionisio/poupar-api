import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ReceiptExtractionFailed extends ApplicationError {
	public override code: ErrorCode;

	constructor(message: string, retryable = true) {
		super();

		this.name = 'ReceiptExtractionFailed';
		this.message = message;
		this.code = ErrorCode.RECEIPT_EXTRACTION_FAILED;
		this.details = { retryable };
	}
}
