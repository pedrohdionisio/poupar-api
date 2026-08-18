import { Controller } from '@application/contracts/Controller';
import { UpdateAccountUseCase } from '@application/usecases/accounts/UpdateAccountUseCase';
import { AdminOnly } from '@kernel/decorators/AdminOnly';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	UpdateAccountBody,
	UpdateAccountParams,
	updateAccountBodySchema,
	updateAccountParamsSchema
} from './schemas/updateAccountSchema';

@Schema({ params: updateAccountParamsSchema, body: updateAccountBodySchema })
@Injectable()
@AdminOnly()
export class UpdateAccountController extends Controller<
	'private',
	UpdateAccountController.Response
> {
	constructor(private readonly updateUseCase: UpdateAccountUseCase) {
		super();
	}

	protected override async handle({
		params,
		body
	}: Controller.Request<
		'private',
		UpdateAccountBody,
		UpdateAccountParams
	>): Promise<Controller.Response<UpdateAccountController.Response>> {
		await this.updateUseCase.execute({
			...body,
			id: params.accountId
		});

		return {
			statusCode: 200
		};
	}
}

export namespace UpdateAccountController {
	export type Response = null;
}
