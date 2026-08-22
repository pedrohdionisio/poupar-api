import { Purchase } from '@application/entities/Purchase';
import { PurchaseRepository } from '@infra/database/dynamo/repositories/PurchaseRepository';
import { Injectable } from '@kernel/decorators/Injectable';

const DEFAULT_LATEST_LIMIT = 10;

@Injectable()
export class ListPurchasesUseCase {
	constructor(private readonly purchaseRepository: PurchaseRepository) {}

	async execute(
		input: ListPurchasesUseCase.Input
	): Promise<ListPurchasesUseCase.Output> {
		if (input.from && input.to) {
			return this.purchaseRepository.listByPeriod({
				accountId: input.accountId,
				from: new Date(input.from).toISOString(),
				to: new Date(input.to).toISOString(),
				limit: input.limit
			});
		}

		return this.purchaseRepository.listLatest({
			accountId: input.accountId,
			limit: input.limit ?? DEFAULT_LATEST_LIMIT
		});
	}
}

export namespace ListPurchasesUseCase {
	export type Input = {
		accountId: string;
		from: string | undefined;
		to: string | undefined;
		limit: number | undefined;
	};

	export type Output = Purchase[];
}
