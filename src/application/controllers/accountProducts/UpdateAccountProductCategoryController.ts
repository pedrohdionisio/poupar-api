import { Controller } from '@application/contracts/Controller';
import { UpdateAccountProductCategoryUseCase } from '@application/usecases/accountProducts/UpdateAccountProductCategoryUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	UpdateAccountProductCategoryBody,
	UpdateAccountProductCategoryParams,
	updateAccountProductCategoryBodySchema,
	updateAccountProductCategoryParamsSchema
} from './schemas/updateAccountProductCategorySchema';

@Schema({
	params: updateAccountProductCategoryParamsSchema,
	body: updateAccountProductCategoryBodySchema
})
@Injectable()
export class UpdateAccountProductCategoryController extends Controller<
	'private',
	UpdateAccountProductCategoryController.Response
> {
	constructor(
		private readonly updateAccountProductCategoryUseCase: UpdateAccountProductCategoryUseCase
	) {
		super();
	}

	protected override async handle({
		accountId,
		params,
		body
	}: Controller.Request<
		'private',
		UpdateAccountProductCategoryBody,
		UpdateAccountProductCategoryParams
	>): Promise<
		Controller.Response<UpdateAccountProductCategoryController.Response>
	> {
		await this.updateAccountProductCategoryUseCase.execute({
			accountId,
			productKey: params.productKey,
			category: body.category
		});

		return { statusCode: 200 };
	}
}

export namespace UpdateAccountProductCategoryController {
	export type Response = null;
}
