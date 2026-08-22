import { PricePoint } from '@application/entities/PricePoint';
import { PricePointRepository } from '@infra/database/dynamo/repositories/PricePointRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class ListPricePointsUseCase {
	constructor(private readonly pricePointRepository: PricePointRepository) {}

	async execute(
		input: ListPricePointsUseCase.Input
	): Promise<ListPricePointsUseCase.Output> {
		return this.pricePointRepository.listByProduct({
			accountId: input.accountId,
			productKey: input.productKey
		});
	}
}

export namespace ListPricePointsUseCase {
	export type Input = {
		accountId: string;
		productKey: string;
	};

	export type Output = PricePoint[];
}
