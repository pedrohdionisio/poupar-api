import { Controller } from '@application/contracts/Controller';
import { ListAccountMerchantsUseCase } from '@application/usecases/accountMerchants/ListAccountMerchantsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListAccountMerchantsController extends Controller<
	'private',
	ListAccountMerchantsController.Response
> {
	constructor(
		private readonly listAccountMerchantsUseCase: ListAccountMerchantsUseCase
	) {
		super();
	}

	protected override async handle({
		accountId
	}: Controller.Request<'private'>): Promise<
		Controller.Response<ListAccountMerchantsController.Response>
	> {
		const accountMerchants = await this.listAccountMerchantsUseCase.execute({
			accountId
		});

		return {
			statusCode: 200,
			body: accountMerchants
		};
	}
}

export namespace ListAccountMerchantsController {
	export type Response = ListAccountMerchantsUseCase.Output;
}
