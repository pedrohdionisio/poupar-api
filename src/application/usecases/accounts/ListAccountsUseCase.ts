import { Account } from '@application/entities/Account';
import { AccountRepository } from '@infra/database/dynamo/repositories/AccountRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListAccountsUseCase {
	constructor(private readonly accountRepository: AccountRepository) {}

	async execute(): Promise<ListAccountsUseCase.Output> {
		const accounts = await this.accountRepository.list();

		return accounts;
	}
}

export namespace ListAccountsUseCase {
	export type Output = Account[];
}
