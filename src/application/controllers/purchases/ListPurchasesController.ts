import { Controller } from '@application/contracts/Controller';
import { ListPurchasesUseCase } from '@application/usecases/purchases/ListPurchasesUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	ListPurchasesQuery,
	listPurchasesQuerySchema
} from './schemas/listPurchasesSchema';

@Schema({ query: listPurchasesQuerySchema })
@Injectable()
export class ListPurchasesController extends Controller<
	'private',
	ListPurchasesController.Response
> {
	constructor(private readonly listPurchasesUseCase: ListPurchasesUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		queryParams
	}: Controller.Request<
		'private',
		Record<string, never>,
		Record<string, never>,
		ListPurchasesQuery
	>): Promise<Controller.Response<ListPurchasesController.Response>> {
		const purchases = await this.listPurchasesUseCase.execute({
			accountId,
			from: queryParams.from,
			to: queryParams.to,
			limit: queryParams.limit
		});

		return {
			statusCode: 200,
			body: purchases
		};
	}
}

export namespace ListPurchasesController {
	export type Response = ListPurchasesUseCase.Output;
}
