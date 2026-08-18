import { AuthGateway } from '@infra/gateways/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class RefreshTokenUseCase {
	constructor(private readonly authGateway: AuthGateway) {}

	async execute(
		input: RefreshTokenUseCase.Input
	): Promise<RefreshTokenUseCase.Output> {
		const { accessToken, refreshToken } =
			await this.authGateway.refreshToken(input);

		return {
			accessToken,
			refreshToken
		};
	}
}

export namespace RefreshTokenUseCase {
	export type Input = {
		refreshToken: string;
	};

	export type Output = {
		accessToken: string;
		refreshToken: string;
	};
}
