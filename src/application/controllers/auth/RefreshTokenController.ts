import { Controller } from '@application/contracts/Controller';
import { RefreshTokenUseCase } from '@application/usecases/auth/RefreshTokenUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	type RefreshTokenBody,
	refreshTokenSchema
} from './schemas/refreshTokenSchema';

@Injectable()
@Schema({ body: refreshTokenSchema })
export class RefreshTokenController extends Controller<
	'public',
	RefreshTokenController.Response
> {
	constructor(private readonly refreshTokenUseCase: RefreshTokenUseCase) {
		super();
	}

	protected override async handle(
		request: Controller.Request<'public', RefreshTokenBody>
	): Promise<Controller.Response<RefreshTokenController.Response>> {
		const { accessToken, refreshToken } =
			await this.refreshTokenUseCase.execute(request.body);

		return {
			statusCode: 200,
			body: {
				accessToken,
				refreshToken
			}
		};
	}
}

export namespace RefreshTokenController {
	export type Response = {
		accessToken: string;
		refreshToken: string;
	};
}
