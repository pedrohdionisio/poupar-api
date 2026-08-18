import { Controller } from '@application/contracts/Controller';
import { Account } from '@application/entities/Account';
import { GetMeUseCase } from '@application/usecases/accounts/GetMeUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class GetMeController extends Controller<
	'private',
	GetMeController.Response
> {
	constructor(private readonly getMeUseCase: GetMeUseCase) {
		super();
	}

	protected override async handle({
		accountId
	}: Controller.Request<'private'>): Promise<
		Controller.Response<GetMeController.Response>
	> {
		const account = await this.getMeUseCase.execute({
			id: accountId
		});

		return {
			statusCode: 200,
			body: account
		};
	}
}

export namespace GetMeController {
	export type Response = Account;
}
