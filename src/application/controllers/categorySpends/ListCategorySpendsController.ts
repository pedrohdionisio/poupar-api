import { Controller } from '@application/contracts/Controller';
import { ListCategorySpendsUseCase } from '@application/usecases/categorySpends/ListCategorySpendsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	ListCategorySpendsQuery,
	listCategorySpendsQuerySchema
} from './schemas/listCategorySpendsSchema';

@Schema({ query: listCategorySpendsQuerySchema })
@Injectable()
export class ListCategorySpendsController extends Controller<
	'private',
	ListCategorySpendsController.Response
> {
	constructor(
		private readonly listCategorySpendsUseCase: ListCategorySpendsUseCase
	) {
		super();
	}

	protected override async handle({
		accountId,
		queryParams
	}: Controller.Request<
		'private',
		Record<string, never>,
		Record<string, never>,
		ListCategorySpendsQuery
	>): Promise<Controller.Response<ListCategorySpendsController.Response>> {
		const categorySpends = await this.listCategorySpendsUseCase.execute({
			accountId,
			from: queryParams.from,
			to: queryParams.to
		});

		return {
			statusCode: 200,
			body: categorySpends
		};
	}
}

export namespace ListCategorySpendsController {
	export type Response = ListCategorySpendsUseCase.Output;
}
