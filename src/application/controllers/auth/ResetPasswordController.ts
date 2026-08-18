import { Controller } from '@application/contracts/Controller';
import { ResetPasswordUseCase } from '@application/usecases/auth/ResetPasswordUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	type ResetPasswordBody,
	resetPasswordSchema
} from './schemas/resetPasswordSchema';

@Injectable()
@Schema({ body: resetPasswordSchema })
export class ResetPasswordController extends Controller<
	'public',
	ResetPasswordController.Response
> {
	constructor(private readonly resetPasswordUseCase: ResetPasswordUseCase) {
		super();
	}

	protected override async handle(
		request: Controller.Request<'public', ResetPasswordBody>
	): Promise<Controller.Response<ResetPasswordController.Response>> {
		await this.resetPasswordUseCase.execute(request.body);

		return {
			statusCode: 200
		};
	}
}

export namespace ResetPasswordController {
	export type Response = null;
}
