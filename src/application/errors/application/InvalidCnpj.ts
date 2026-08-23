import { ErrorCode } from '../ErrorCode';
import { ApplicationError } from './ApplicationError';

export class InvalidCnpj extends ApplicationError {
	public override code: ErrorCode;
	public override statusCode = 400;

	constructor(cnpj: string) {
		super();

		this.name = 'InvalidCnpj';
		this.message = `"${cnpj}" is not a valid CNPJ.`;
		this.code = ErrorCode.VALIDATION;
	}
}
