import { Controller } from '@application/contracts/Controller';
import { ListPricePointsUseCase } from '@application/usecases/pricePoints/ListPricePointsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	ListPricePointsQuery,
	listPricePointsQuerySchema
} from './schemas/listPricePointsSchema';

@Schema({ query: listPricePointsQuerySchema })
@Injectable()
export class ListPricePointsController extends Controller<
	'private',
	ListPricePointsController.Response
> {
	constructor(private readonly listPricePointsUseCase: ListPricePointsUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		queryParams
	}: Controller.Request<
		'private',
		Record<string, never>,
		Record<string, never>,
		ListPricePointsQuery
	>): Promise<Controller.Response<ListPricePointsController.Response>> {
		const pricePoints = await this.listPricePointsUseCase.execute({
			accountId,
			productKey: queryParams.productKey
		});

		return {
			statusCode: 200,
			body: pricePoints
		};
	}
}

export namespace ListPricePointsController {
	export type Response = ListPricePointsUseCase.Output;
}
