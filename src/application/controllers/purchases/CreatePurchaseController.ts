import { Controller } from '@application/contracts/Controller';
import { CreatePurchaseUseCase } from '@application/usecases/purchases/CreatePurchaseUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	CreatePurchaseBody,
	createPurchaseBodySchema
} from './schemas/createPurchaseSchema';

@Schema({ body: createPurchaseBodySchema })
@Injectable()
export class CreatePurchaseController extends Controller<
	'private',
	CreatePurchaseController.Response
> {
	constructor(private readonly createPurchaseUseCase: CreatePurchaseUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		body
	}: Controller.Request<'private', CreatePurchaseBody>): Promise<
		Controller.Response<CreatePurchaseController.Response>
	> {
		const { id, purchasedAt } = await this.createPurchaseUseCase.execute({
			...body,
			accountId
		});

		return {
			statusCode: 201,
			body: { id, purchasedAt: purchasedAt.toISOString() }
		};
	}
}

export namespace CreatePurchaseController {
	export type Response = {
		id: string;
		purchasedAt: string;
	};
}
