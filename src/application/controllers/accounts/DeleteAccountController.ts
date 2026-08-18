import { Controller } from '@application/contracts/Controller';
import { DeleteAccountUseCase } from '@application/usecases/accounts/DeleteAccountUseCase';
import { AdminOnly } from '@kernel/decorators/AdminOnly';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	DeleteAccountParams,
	deleteAccountSchema
} from './schemas/deleteAccountSchema';

@Schema({ params: deleteAccountSchema })
@Injectable()
@AdminOnly()
export class DeleteAccountController extends Controller<
	'private',
	DeleteAccountController.Response
> {
	constructor(private readonly deleteUseCase: DeleteAccountUseCase) {
		super();
	}

	protected override async handle({
		params
	}: Controller.Request<'private', any, DeleteAccountParams>): Promise<
		Controller.Response<DeleteAccountController.Response>
	> {
		await this.deleteUseCase.execute({
			id: params.accountId
		});

		return {
			statusCode: 200
		};
	}
}

export namespace DeleteAccountController {
	export type Response = null;
}
