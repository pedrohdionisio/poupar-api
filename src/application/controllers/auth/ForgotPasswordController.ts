import { Controller } from '@application/contracts/Controller';
import { ForgotPasswordUseCase } from '@application/usecases/auth/ForgotPasswordUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	type ForgotPasswordBody,
	forgotPasswordSchema
} from './schemas/forgotPasswordSchema';

@Injectable()
@Schema({ body: forgotPasswordSchema })
export class ForgotPasswordController extends Controller<
	'public',
	ForgotPasswordController.Response
> {
	constructor(private readonly forgotPasswordUseCase: ForgotPasswordUseCase) {
		super();
	}

	protected override async handle(
		request: Controller.Request<'public', ForgotPasswordBody>
	): Promise<Controller.Response<ForgotPasswordController.Response>> {
		await this.forgotPasswordUseCase.execute(request.body);

		return {
			statusCode: 200
		};
	}
}

export namespace ForgotPasswordController {
	export type Response = null;
}
