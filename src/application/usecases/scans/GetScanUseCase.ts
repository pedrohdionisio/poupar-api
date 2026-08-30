import { Scan } from '@application/entities/Scan';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable()
export class GetScanUseCase {
	constructor(private readonly scanRepository: ScanRepository) {}

	async execute(input: GetScanUseCase.Input): Promise<GetScanUseCase.Output> {
		const scan = await this.scanRepository.getById({
			accountId: input.accountId,
			id: input.id
		});

		if (!scan) {
			throw new ResourceNotFound('Scan not found.');
		}

		return {
			id: scan.id,
			accountId: scan.accountId,
			merchantId: scan.merchantId,
			status: scan.status,
			provider: scan.provider,
			draft: scan.draft,
			purchaseId: scan.purchaseId,
			errorCode: scan.errorCode,
			attempts: scan.attempts,
			createdAt: scan.createdAt,
			updatedAt: scan.updatedAt
		};
	}
}

export namespace GetScanUseCase {
	export type Input = {
		accountId: string;
		id: string;
	};

	export type Output = Omit<Scan, 'photoS3Key' | 'ocrS3Key' | 'ttl'>;
}
