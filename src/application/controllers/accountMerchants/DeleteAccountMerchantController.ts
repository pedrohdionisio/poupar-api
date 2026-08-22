import { Controller } from '@application/contracts/Controller';
import { DeleteAccountMerchantUseCase } from '@application/usecases/accountMerchants/DeleteAccountMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	DeleteAccountMerchantParams,
	deleteAccountMerchantParamsSchema
} from './schemas/deleteAccountMerchantSchema';

@Schema({ params: deleteAccountMerchantParamsSchema })
@Injectable()
export class DeleteAccountMerchantController extends Controller<
	'private',
	DeleteAccountMerchantController.Response
> {
	constructor(
		private readonly deleteAccountMerchantUseCase: DeleteAccountMerchantUseCase
	) {
		super();
	}

	protected override async handle({
		accountId,
		params
	}: Controller.Request<
		'private',
		Record<string, never>,
		DeleteAccountMerchantParams
	>): Promise<Controller.Response<DeleteAccountMerchantController.Response>> {
		await this.deleteAccountMerchantUseCase.execute({
			accountId,
			cnpj: params.cnpj
		});

		return {
			statusCode: 200
		};
	}
}

export namespace DeleteAccountMerchantController {
	export type Response = null;
}
