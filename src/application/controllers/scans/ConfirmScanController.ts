import { Controller } from '@application/contracts/Controller';
import { ConfirmScanUseCase } from '@application/usecases/scans/ConfirmScanUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	ConfirmScanBody,
	ConfirmScanParams,
	confirmScanBodySchema,
	confirmScanParamsSchema
} from './schemas/confirmScanSchema';

@Schema({ params: confirmScanParamsSchema, body: confirmScanBodySchema })
@Injectable()
export class ConfirmScanController extends Controller<
	'private',
	ConfirmScanController.Response
> {
	constructor(private readonly confirmScanUseCase: ConfirmScanUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params,
		body
	}: Controller.Request<
		'private',
		ConfirmScanBody,
		ConfirmScanParams
	>): Promise<Controller.Response<ConfirmScanController.Response>> {
		const { purchaseId, purchasedAt, itemCount, totalCents } =
			await this.confirmScanUseCase.execute({
				...body,
				accountId,
				scanId: params.scanId
			});

		return {
			statusCode: 201,
			body: {
				purchaseId,
				purchasedAt: purchasedAt.toISOString(),
				itemCount,
				totalCents
			}
		};
	}
}

export namespace ConfirmScanController {
	export type Response = {
		purchaseId: string;
		purchasedAt: string;
		itemCount: number;
		totalCents: number;
	};
}
