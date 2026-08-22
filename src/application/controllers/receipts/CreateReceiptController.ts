import { Controller } from '@application/contracts/Controller';
import { CreateReceiptUseCase } from '@application/usecases/receipts/CreateReceiptUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	CreateReceiptBody,
	CreateReceiptParams,
	createReceiptBodySchema,
	createReceiptParamsSchema
} from './schemas/createReceiptSchema';

@Schema({
	params: createReceiptParamsSchema,
	body: createReceiptBodySchema
})
@Injectable()
export class CreateReceiptController extends Controller<
	'private',
	CreateReceiptController.Response
> {
	constructor(private readonly createReceiptUseCase: CreateReceiptUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params,
		body
	}: Controller.Request<
		'private',
		CreateReceiptBody,
		CreateReceiptParams
	>): Promise<Controller.Response<CreateReceiptController.Response>> {
		const { purchaseId } = await this.createReceiptUseCase.execute({
			...body,
			accountId,
			purchaseId: params.purchaseId
		});

		return {
			statusCode: 201,
			body: { purchaseId }
		};
	}
}

export namespace CreateReceiptController {
	export type Response = {
		purchaseId: string;
	};
}
