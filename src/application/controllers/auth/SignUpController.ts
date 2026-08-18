import { Controller } from '@application/contracts/Controller';
import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { type SignUpBody, signUpSchema } from './schemas/signUpSchema';

@Injectable()
@Schema({ body: signUpSchema })
export class SignUpController extends Controller<
	'private',
	SignUpController.Response
> {
	constructor(private readonly signUpUseCase: SignUpUseCase) {
		super();
	}

	protected override async handle(
		request: Controller.Request<'private', SignUpBody>
	): Promise<Controller.Response<SignUpController.Response>> {
		const { accessToken, refreshToken } = await this.signUpUseCase.execute(
			request.body
		);

		return {
			statusCode: 201,
			body: {
				accessToken,
				refreshToken
			}
		};
	}
}

export namespace SignUpController {
	export type Response = {
		accessToken: string;
		refreshToken: string;
	};
}
