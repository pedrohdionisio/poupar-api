import { Controller } from '@application/contracts/Controller';
import { DeleteMerchantUseCase } from '@application/usecases/merchants/DeleteMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	DeleteMerchantParams,
	deleteMerchantParamsSchema
} from './schemas/deleteMerchantSchema';

@Schema({ params: deleteMerchantParamsSchema })
@Injectable()
export class DeleteMerchantController extends Controller<
	'private',
	DeleteMerchantController.Response
> {
	constructor(private readonly deleteMerchantUseCase: DeleteMerchantUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		DeleteMerchantParams
	>): Promise<Controller.Response<DeleteMerchantController.Response>> {
		await this.deleteMerchantUseCase.execute({
			accountId,
			id: params.merchantId
		});

		return {
			statusCode: 200
		};
	}
}

export namespace DeleteMerchantController {
	export type Response = null;
}
