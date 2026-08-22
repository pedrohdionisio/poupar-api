import { Controller } from '@application/contracts/Controller';
import { CreateMerchantUseCase } from '@application/usecases/merchants/CreateMerchantUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	CreateMerchantBody,
	createMerchantBodySchema
} from './schemas/createMerchantSchema';

@Schema({ body: createMerchantBodySchema })
@Injectable()
export class CreateMerchantController extends Controller<
	'private',
	CreateMerchantController.Response
> {
	constructor(private readonly createMerchantUseCase: CreateMerchantUseCase) {
		super();
	}

	protected override async handle({
		body
	}: Controller.Request<'private', CreateMerchantBody>): Promise<
		Controller.Response<CreateMerchantController.Response>
	> {
		const { cnpj } = await this.createMerchantUseCase.execute(body);

		return {
			statusCode: 201,
			body: { cnpj }
		};
	}
}

export namespace CreateMerchantController {
	export type Response = {
		cnpj: string;
	};
}
