import { Controller } from '@application/contracts/Controller';
import { SignInUseCase } from '@application/usecases/auth/SignInUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { type SignInBody, signInSchema } from './schemas/signInSchema';

@Injectable()
@Schema({ body: signInSchema })
export class SignInController extends Controller<
	'private',
	SignInController.Response
> {
	constructor(private readonly signInUseCase: SignInUseCase) {
		super();
	}

	protected override async handle(
		request: Controller.Request<'private', SignInBody>
	): Promise<Controller.Response<SignInController.Response>> {
		const { accessToken, refreshToken } = await this.signInUseCase.execute(
			request.body
		);

		return {
			statusCode: 200,
			body: {
				accessToken,
				refreshToken
			}
		};
	}
}

export namespace SignInController {
	export type Response = {
		accessToken: string;
		refreshToken: string;
	};
}
