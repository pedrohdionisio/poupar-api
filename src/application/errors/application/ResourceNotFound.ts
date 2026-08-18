import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class ResourceNotFound extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 404;

	constructor(message?: string) {
		super();

		this.name = 'ResourceNotFound';
		this.message = message ?? 'The resource was not found';
		this.code = ErrorCode.RESOURCE_NOT_FOUND;
	}
}
