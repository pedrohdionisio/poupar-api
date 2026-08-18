import { Account } from '@application/entities/Account';
import { AccountRepository } from '@infra/database/dynamo/repositories/AccountRepository';
import { AuthGateway } from '@infra/gateways/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';
import { Saga } from '@shared/saga/Saga';

@Injectable()
export class SignUpUseCase {
	constructor(
		private readonly authGateway: AuthGateway,
		private readonly accountRepository: AccountRepository,
		private readonly saga: Saga
	) {}

	async execute({
		name,
		email,
		password,
		role
	}: SignUpUseCase.Input): Promise<SignUpUseCase.Output> {
		return this.saga.run(async () => {
			const account = new Account({ name, email, role });

			const { externalId } = await this.authGateway.signUp({
				email,
				password,
				internalId: account.id
			});

			this.saga.addCompensations(
				async () => await this.authGateway.deleteUser({ externalId })
			);

			await this.authGateway.addUserToGroup({
				externalId,
				group: `${role.toLowerCase()}s`
			});

			account.externalId = externalId;

			await this.accountRepository.create({ account });

			const { accessToken, refreshToken } = await this.authGateway.signIn({
				email,
				password
			});

			return {
				accessToken,
				refreshToken
			};
		});
	}
}

export namespace SignUpUseCase {
	export type Input = {
		name: string;
		email: string;
		password: string;
		role: Account.Role;
	};

	export type Output = {
		accessToken: string;
		refreshToken: string;
	};
}
