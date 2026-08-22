import { Controller } from '@application/contracts/Controller';
import { Receipt } from '@application/entities/Receipt';
import { GetReceiptUseCase } from '@application/usecases/receipts/GetReceiptUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	GetReceiptParams,
	getReceiptParamsSchema
} from './schemas/getReceiptSchema';

@Schema({ params: getReceiptParamsSchema })
@Injectable()
export class GetReceiptController extends Controller<
	'private',
	GetReceiptController.Response
> {
	constructor(private readonly getReceiptUseCase: GetReceiptUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		GetReceiptParams
	>): Promise<Controller.Response<GetReceiptController.Response>> {
		const receipt = await this.getReceiptUseCase.execute({
			accountId,
			purchaseId: params.purchaseId
		});

		return {
			statusCode: 200,
			body: receipt
		};
	}
}

export namespace GetReceiptController {
	export type Response = Receipt;
}
