import { AuthGateway } from '@infra/gateways/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ResetPasswordUseCase {
	constructor(private readonly authGateway: AuthGateway) {}

	async execute(
		input: ResetPasswordUseCase.Input
	): Promise<ResetPasswordUseCase.Output> {
		await this.authGateway.resetPassword(input);
	}
}

export namespace ResetPasswordUseCase {
	export type Input = {
		email: string;
		code: string;
		password: string;
	};

	export type Output = void;
}
