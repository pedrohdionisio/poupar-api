import { Controller } from '@application/contracts/Controller';
import { DeletePurchaseUseCase } from '@application/usecases/purchases/DeletePurchaseUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	DeletePurchaseParams,
	deletePurchaseParamsSchema
} from './schemas/deletePurchaseSchema';

@Schema({ params: deletePurchaseParamsSchema })
@Injectable()
export class DeletePurchaseController extends Controller<
	'private',
	DeletePurchaseController.Response
> {
	constructor(private readonly deletePurchaseUseCase: DeletePurchaseUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		DeletePurchaseParams
	>): Promise<Controller.Response<DeletePurchaseController.Response>> {
		await this.deletePurchaseUseCase.execute({
			accountId,
			id: params.purchaseId,
			purchasedAt: params.purchasedAt
		});

		return {
			statusCode: 200
		};
	}
}

export namespace DeletePurchaseController {
	export type Response = null;
}
