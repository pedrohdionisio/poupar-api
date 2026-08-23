import { Controller } from '@application/contracts/Controller';
import { ImportPurchaseUseCase } from '@application/usecases/purchases/ImportPurchaseUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import {
	ImportPurchaseBody,
	importPurchaseBodySchema
} from './schemas/importPurchaseSchema';

@Schema({ body: importPurchaseBodySchema })
@Injectable()
export class ImportPurchaseController extends Controller<
	'private',
	ImportPurchaseController.Response
> {
	constructor(private readonly importPurchaseUseCase: ImportPurchaseUseCase) {
		super();
	}

	protected override async handle({
		accountId,
		body
	}: Controller.Request<'private', ImportPurchaseBody>): Promise<
		Controller.Response<ImportPurchaseController.Response>
	> {
		const { purchaseId, purchasedAt, itemCount, totalCents } =
			await this.importPurchaseUseCase.execute({
				...body,
				accountId
			});

		return {
			statusCode: 201,
			body: {
				purchaseId,
				purchasedAt: purchasedAt.toISOString(),
				itemCount,
				totalCents
			}
		};
	}
}

export namespace ImportPurchaseController {
	export type Response = {
		purchaseId: string;
		purchasedAt: string;
		itemCount: number;
		totalCents: number;
	};
}
