import { Account } from '@application/entities/Account';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { AccountRepository } from '@infra/database/dynamo/repositories/AccountRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class UpdateAccountUseCase {
	constructor(private readonly accountRepository: AccountRepository) {}

	async execute(
		input: UpdateAccountUseCase.Input
	): Promise<UpdateAccountUseCase.Output> {
		const account = await this.accountRepository.getById({ id: input.id });

		if (!account) {
			throw new ResourceNotFound('Account not found.');
		}

		await this.accountRepository.update(input);
	}
}

export namespace UpdateAccountUseCase {
	export type Input = {
		id: string;
		name: string;
		role: Account.Role;
	};

	export type Output = void;
}
