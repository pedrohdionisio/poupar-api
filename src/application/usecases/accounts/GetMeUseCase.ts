import { Account } from '@application/entities/Account';
import { UserNotFound } from '@application/errors/application/UserNotFound';
import { AccountRepository } from '@infra/database/dynamo/repositories/AccountRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class GetMeUseCase {
	constructor(private readonly accountRepository: AccountRepository) {}

	async execute(input: GetMeUseCase.Input): Promise<GetMeUseCase.Output> {
		const account = await this.accountRepository.getById(input);

		if (!account) {
			throw new UserNotFound();
		}

		return account;
	}
}

export namespace GetMeUseCase {
	export type Input = {
		id: string;
	};

	export type Output = Account;
}
