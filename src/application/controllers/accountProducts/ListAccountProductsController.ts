import { Controller } from '@application/contracts/Controller';
import { ListAccountProductsUseCase } from '@application/usecases/accountProducts/ListAccountProductsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListAccountProductsController extends Controller<
	'private',
	ListAccountProductsController.Response
> {
	constructor(
		private readonly listAccountProductsUseCase: ListAccountProductsUseCase
	) {
		super();
	}

	protected override async handle({
		accountId
	}: Controller.Request<'private'>): Promise<
		Controller.Response<ListAccountProductsController.Response>
	> {
		const accountProducts = await this.listAccountProductsUseCase.execute({
			accountId
		});

		return {
			statusCode: 200,
			body: accountProducts
		};
	}
}

export namespace ListAccountProductsController {
	export type Response = ListAccountProductsUseCase.Output;
}
