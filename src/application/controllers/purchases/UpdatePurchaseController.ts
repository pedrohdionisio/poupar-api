import { Controller } from '@application/contracts/Controller';
import { UpdatePurchaseUseCase } from '@application/usecases/purchases/UpdatePurchaseUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	UpdatePurchaseBody,
	UpdatePurchaseParams,
	updatePurchaseBodySchema,
	updatePurchaseParamsSchema
} from './schemas/updatePurchaseSchema';

@Schema({
	params: updatePurchaseParamsSchema,
	body: updatePurchaseBodySchema
})
@Injectable()
export class UpdatePurchaseController extends Controller<
	'private',
	UpdatePurchaseController.Response
> {
	constructor(private readonly updatePurchaseUseCase: UpdatePurchaseUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params,
		body
	}: Controller.Request<
		'private',
		UpdatePurchaseBody,
		UpdatePurchaseParams
	>): Promise<Controller.Response<UpdatePurchaseController.Response>> {
		await this.updatePurchaseUseCase.execute({
			...body,
			accountId,
			id: params.purchaseId,
			purchasedAt: params.purchasedAt
		});

		return {
			statusCode: 200
		};
	}
}

export namespace UpdatePurchaseController {
	export type Response = null;
}
