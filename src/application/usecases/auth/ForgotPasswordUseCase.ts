import { AuthGateway } from '@infra/gateways/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ForgotPasswordUseCase {
	constructor(private readonly authGateway: AuthGateway) {}

	async execute(
		input: ForgotPasswordUseCase.Input
	): Promise<ForgotPasswordUseCase.Output> {
		await this.authGateway.forgotPassword(input);
	}
}

export namespace ForgotPasswordUseCase {
	export type Input = {
		email: string;
	};

	export type Output = void;
}
