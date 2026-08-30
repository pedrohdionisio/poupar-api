import { Scan } from '@application/entities/Scan';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { Injectable } from '@kernel/decorators/Injectable';

const DEFAULT_LIMIT = 20;

@Injectable()
export class ListScansUseCase {
	constructor(private readonly scanRepository: ScanRepository) {}

	async execute(
		input: ListScansUseCase.Input
	): Promise<ListScansUseCase.Output> {
		const scans = await this.scanRepository.listByAccount({
			accountId: input.accountId,
			status: input.status,
			limit: input.limit ?? DEFAULT_LIMIT
		});

		return scans.map((scan) => ({
			id: scan.id,
			accountId: scan.accountId,
			merchantId: scan.merchantId,
			status: scan.status,
			provider: scan.provider,
			purchaseId: scan.purchaseId,
			errorCode: scan.errorCode,
			attempts: scan.attempts,
			summary: ListScansUseCase.toSummary({ draft: scan.draft }),
			createdAt: scan.createdAt,
			updatedAt: scan.updatedAt
		}));
	}

	private static toSummary({
		draft
	}: ListScansUseCase.ToSummaryParams): ListScansUseCase.Summary | null {
		if (!draft) {
			return null;
		}

		return {
			purchasedAt: draft.purchasedAt,
			totalCents: draft.totalCents,
			itemCount: draft.items.length
		};
	}
}

export namespace ListScansUseCase {
	export type Input = {
		accountId: string;
		status: Scan.Status | undefined;
		limit: number | undefined;
	};

	export type Summary = {
		purchasedAt: string;
		totalCents: number;
		itemCount: number;
	};

	export type ToSummaryParams = {
		draft: Scan.Draft | null;
	};

	export type Item = Omit<Scan, 'photoS3Key' | 'ocrS3Key' | 'ttl' | 'draft'> & {
		summary: Summary | null;
	};

	export type Output = Item[];
}
