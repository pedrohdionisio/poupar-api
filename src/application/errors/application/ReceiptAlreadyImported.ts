import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ReceiptAlreadyImported extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 409;

	constructor(purchaseId: string | null) {
		super();

		this.name = 'ReceiptAlreadyImported';
		this.message = 'Receipt already imported.';
		this.code = ErrorCode.RESOURCE_ALREADY_EXISTS;

		if (purchaseId) {
			this.details = { purchaseId };
		}
	}
}
