import { Controller } from '@application/contracts/Controller';
import { CreateScanUseCase } from '@application/usecases/scans/CreateScanUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	CreateScanBody,
	createScanBodySchema
} from './schemas/createScanSchema';

@Schema({ body: createScanBodySchema })
@Injectable()
export class CreateScanController extends Controller<
	'private',
	CreateScanController.Response
> {
	constructor(private readonly createScanUseCase: CreateScanUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		body
	}: Controller.Request<'private', CreateScanBody>): Promise<
		Controller.Response<CreateScanController.Response>
	> {
		const scan = await this.createScanUseCase.execute({
			accountId,
			contentType: body.contentType
		});

		return {
			statusCode: 201,
			body: scan
		};
	}
}

export namespace CreateScanController {
	export type Response = CreateScanUseCase.Output;
}
