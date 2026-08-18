import { AuthGateway } from '@infra/gateways/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class SignInUseCase {
	constructor(private readonly authGateway: AuthGateway) {}

	async execute(input: SignInUseCase.Input): Promise<SignInUseCase.Output> {
		const { accessToken, refreshToken } = await this.authGateway.signIn(input);

		return {
			accessToken,
			refreshToken
		};
	}
}

export namespace SignInUseCase {
	export type Input = {
		email: string;
		password: string;
	};

	export type Output = {
		accessToken: string;
		refreshToken: string;
	};
}
