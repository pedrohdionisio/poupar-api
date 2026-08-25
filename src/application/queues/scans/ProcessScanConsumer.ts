import type { IQueueConsumer } from '@application/contracts/IQueueConsumer';
import { Scan } from '@application/entities/Scan';
import { InvalidScanKey } from '@application/errors/application/InvalidScanKey';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ScanRepository } from '@infra/database/dynamo/repositories/ScanRepository';
import { Injectable } from '@kernel/decorators/Injectable';

const SCAN_KEY_PATTERN =
	/^scans\/(?<accountId>[0-9A-HJKMNP-TV-Z]{26})\/(?<scanId>[0-9A-HJKMNP-TV-Z]{26})$/;

@Injectable()
export class ProcessScanConsumer
	implements IQueueConsumer<ProcessScanConsumer.Message>
{
	constructor(private readonly scanRepository: ScanRepository) {}

	async process(message: ProcessScanConsumer.Message): Promise<void> {
		if (!message.Records) {
			return;
		}

		for (const record of message.Records) {
			await this.processObject({ key: record.s3.object.key });
		}
	}

	private async processObject({
		key
	}: ProcessScanConsumer.ProcessObjectParams): Promise<void> {
		const match = key.match(SCAN_KEY_PATTERN);

		if (!match?.groups) {
			throw new InvalidScanKey(key);
		}

		const { accountId, scanId } = match.groups;

		const scan = await this.scanRepository.getById({
			accountId: accountId!,
			id: scanId!
		});

		if (!scan) {
			throw new ResourceNotFound(`Scan not found for key "${key}".`);
		}

		if (scan.status !== Scan.Status.PENDING) {
			return;
		}

		scan.status = Scan.Status.PROCESSING;
		scan.attempts = scan.attempts + 1;
		scan.updatedAt = new Date();

		await this.scanRepository.update({ scan });
	}
}

export namespace ProcessScanConsumer {
	export type Message = {
		Records?: {
			s3: {
				object: {
					key: string;
				};
			};
		}[];
	};

	export type ProcessObjectParams = {
		key: string;
	};
}
