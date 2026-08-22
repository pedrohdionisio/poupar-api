import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ResourceAlreadyExists extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 409;

	constructor(message?: string) {
		super();

		this.name = 'ResourceAlreadyExists';
		this.message = message ?? 'The resource already exists';
		this.code = ErrorCode.RESOURCE_ALREADY_EXISTS;
	}
}
