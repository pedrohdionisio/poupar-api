import { Controller } from '@application/contracts/Controller';
import { GetScanUseCase } from '@application/usecases/scans/GetScanUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { GetScanParams, getScanParamsSchema } from './schemas/getScanSchema';

@Schema({ params: getScanParamsSchema })
@Injectable()
export class GetScanController extends Controller<
	'private',
	GetScanController.Response
> {
	constructor(private readonly getScanUseCase: GetScanUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		GetScanParams
	>): Promise<Controller.Response<GetScanController.Response>> {
		const scan = await this.getScanUseCase.execute({
			accountId,
			id: params.scanId
		});

		return {
			statusCode: 200,
			body: scan
		};
	}
}

export namespace GetScanController {
	export type Response = GetScanUseCase.Output;
}
