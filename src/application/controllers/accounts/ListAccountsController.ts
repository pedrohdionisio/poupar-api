import { Controller } from '@application/contracts/Controller';
import { Account } from '@application/entities/Account';
import { ListAccountsUseCase } from '@application/usecases/accounts/ListAccountsUseCase';
import { AdminOnly } from '@kernel/decorators/AdminOnly';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
@AdminOnly()
export class ListAccountsController extends Controller<
	'private',
	ListAccountsController.Response
> {
	constructor(private readonly listAccountsUseCase: ListAccountsUseCase) {
		super();
	}

	protected override async handle(): Promise<
		Controller.Response<ListAccountsController.Response>
	> {
		const accounts = await this.listAccountsUseCase.execute();

		return {
			statusCode: 200,
			body: accounts
		};
	}
}

export namespace ListAccountsController {
	export type Response = Account[];
}
