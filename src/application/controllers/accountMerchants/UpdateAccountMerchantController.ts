import { Controller } from '@application/contracts/Controller';
import { UpdateAccountMerchantUseCase } from '@application/usecases/accountMerchants/UpdateAccountMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	UpdateAccountMerchantBody,
	UpdateAccountMerchantParams,
	updateAccountMerchantBodySchema,
	updateAccountMerchantParamsSchema
} from './schemas/updateAccountMerchantSchema';

@Schema({
	params: updateAccountMerchantParamsSchema,
	body: updateAccountMerchantBodySchema
})
@Injectable()
export class UpdateAccountMerchantController extends Controller<
	'private',
	UpdateAccountMerchantController.Response
> {
	constructor(
		private readonly updateAccountMerchantUseCase: UpdateAccountMerchantUseCase
	) {
		super();
	}

	protected override async handle({
		accountId,
		params,
		body
	}: Controller.Request<
		'private',
		UpdateAccountMerchantBody,
		UpdateAccountMerchantParams
	>): Promise<Controller.Response<UpdateAccountMerchantController.Response>> {
		await this.updateAccountMerchantUseCase.execute({
			accountId,
			cnpj: params.cnpj,
			alias: body.alias
		});

		return {
			statusCode: 200
		};
	}
}

export namespace UpdateAccountMerchantController {
	export type Response = null;
}
