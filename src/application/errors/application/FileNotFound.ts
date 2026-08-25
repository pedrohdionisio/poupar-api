import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class FileNotFound extends ApplicationError {
	public override code: ErrorCode;

	constructor(key: string) {
		super();

		this.name = 'FileNotFound';
		this.message = `File "${key}" was not found.`;
		this.code = ErrorCode.RESOURCE_NOT_FOUND;
	}
}
