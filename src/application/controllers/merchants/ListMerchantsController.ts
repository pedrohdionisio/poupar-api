import { Controller } from '@application/contracts/Controller';
import { Merchant } from '@application/entities/Merchant';
import { ListMerchantsUseCase } from '@application/usecases/merchants/ListMerchantsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListMerchantsController extends Controller<
	'private',
	ListMerchantsController.Response
> {
	constructor(private readonly listMerchantsUseCase: ListMerchantsUseCase) {
		super();
	}

	protected override async handle({
		accountId
	}: Controller.Request<'private'>): Promise<
		Controller.Response<ListMerchantsController.Response>
	> {
		const merchants = await this.listMerchantsUseCase.execute({ accountId });

		return {
			statusCode: 200,
			body: merchants
		};
	}
}

export namespace ListMerchantsController {
	export type Response = Merchant[];
}
