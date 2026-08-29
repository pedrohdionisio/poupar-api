import { Controller } from '@application/contracts/Controller';
import { ListScansUseCase } from '@application/usecases/scans/ListScansUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	ListScansQuery,
	listScansQuerySchema
} from './schemas/listScansSchema';

@Schema({ query: listScansQuerySchema })
@Injectable()
export class ListScansController extends Controller<
	'private',
	ListScansController.Response
> {
	constructor(private readonly listScansUseCase: ListScansUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		queryParams
	}: Controller.Request<
		'private',
		Record<string, never>,
		Record<string, never>,
		ListScansQuery
	>): Promise<Controller.Response<ListScansController.Response>> {
		const scans = await this.listScansUseCase.execute({
			accountId,
			status: queryParams.status,
			limit: queryParams.limit
		});

		return {
			statusCode: 200,
			body: scans
		};
	}
}

export namespace ListScansController {
	export type Response = ListScansUseCase.Output;
}
