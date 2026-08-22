import { Controller } from '@application/contracts/Controller';
import { Merchant } from '@application/entities/Merchant';
import { GetMerchantUseCase } from '@application/usecases/merchants/GetMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	GetMerchantParams,
	getMerchantParamsSchema
} from './schemas/getMerchantSchema';

@Schema({ params: getMerchantParamsSchema })
@Injectable()
export class GetMerchantController extends Controller<
	'private',
	GetMerchantController.Response
> {
	constructor(private readonly getMerchantUseCase: GetMerchantUseCase) {
		super();
	}

	protected override async handle({
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		GetMerchantParams
	>): Promise<Controller.Response<GetMerchantController.Response>> {
		const merchant = await this.getMerchantUseCase.execute({
			cnpj: params.cnpj
		});

		return {
			statusCode: 200,
			body: merchant
		};
	}
}

export namespace GetMerchantController {
	export type Response = Merchant;
}
