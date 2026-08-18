import { AccountRepository } from '@infra/database/dynamo/repositories/AccountRepository';
import { AuthGateway } from '@infra/gateways/AuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';
import { Saga } from '@shared/saga/Saga';

@Injectable()
export class DeleteAccountUseCase {
	constructor(
		private readonly accountRepository: AccountRepository,
		private readonly authGateway: AuthGateway,
		private readonly saga: Saga
	) {}

	async execute({
		id
	}: DeleteAccountUseCase.Input): Promise<DeleteAccountUseCase.Output> {
		return this.saga.run(async () => {
			const account = await this.accountRepository.getById({ id });

			if (!account || !account.externalId) {
				return;
			}

			await this.accountRepository.delete({ id });

			this.saga.addCompensations(
				async () => await this.accountRepository.create({ account })
			);

			await this.authGateway.deleteUser({ externalId: account.externalId });
		});
	}
}

export namespace DeleteAccountUseCase {
	export type Input = {
		id: string;
	};

	export type Output = void;
}
