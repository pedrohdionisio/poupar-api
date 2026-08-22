import { Controller } from '@application/contracts/Controller';
import { GetAccountMerchantUseCase } from '@application/usecases/accountMerchants/GetAccountMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	GetAccountMerchantParams,
	getAccountMerchantParamsSchema
} from './schemas/getAccountMerchantSchema';

@Schema({ params: getAccountMerchantParamsSchema })
@Injectable()
export class GetAccountMerchantController extends Controller<
	'private',
	GetAccountMerchantController.Response
> {
	constructor(
		private readonly getAccountMerchantUseCase: GetAccountMerchantUseCase
	) {
		super();
	}

	protected override async handle({
		accountId,
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		GetAccountMerchantParams
	>): Promise<Controller.Response<GetAccountMerchantController.Response>> {
		const accountMerchant = await this.getAccountMerchantUseCase.execute({
			accountId,
			cnpj: params.cnpj
		});

		return {
			statusCode: 200,
			body: accountMerchant
		};
	}
}

export namespace GetAccountMerchantController {
	export type Response = GetAccountMerchantUseCase.Output;
}
