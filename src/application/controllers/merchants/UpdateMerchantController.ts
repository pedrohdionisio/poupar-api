import { Controller } from '@application/contracts/Controller';
import { UpdateMerchantUseCase } from '@application/usecases/merchants/UpdateMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	UpdateMerchantBody,
	UpdateMerchantParams,
	updateMerchantBodySchema,
	updateMerchantParamsSchema
} from './schemas/updateMerchantSchema';

@Schema({ params: updateMerchantParamsSchema, body: updateMerchantBodySchema })
@Injectable()
export class UpdateMerchantController extends Controller<
	'private',
	UpdateMerchantController.Response
> {
	constructor(private readonly updateMerchantUseCase: UpdateMerchantUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		params,
		body
	}: Controller.Request<
		'private',
		UpdateMerchantBody,
		UpdateMerchantParams
	>): Promise<Controller.Response<UpdateMerchantController.Response>> {
		await this.updateMerchantUseCase.execute({
			...body,
			accountId,
			id: params.merchantId
		});

		return {
			statusCode: 200
		};
	}
}

export namespace UpdateMerchantController {
	export type Response = null;
}
