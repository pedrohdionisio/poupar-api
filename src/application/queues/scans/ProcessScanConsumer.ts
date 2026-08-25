import type { IQueueConsumer } from '@application/contracts/IQueueConsumer';
import { InvalidScanKey } from '@application/errors/application/InvalidScanKey';
import { ProcessScanUseCase } from '@application/usecases/scans/ProcessScanUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

const SCAN_KEY_PATTERN =
	/^scans\/(?<accountId>[0-9A-HJKMNP-TV-Z]{26})\/(?<scanId>[0-9A-HJKMNP-TV-Z]{26})$/;

@Injectable()
export class ProcessScanConsumer
	implements IQueueConsumer<ProcessScanConsumer.Message>
{
	constructor(private readonly processScanUseCase: ProcessScanUseCase) {}

	async process(message: ProcessScanConsumer.Message): Promise<void> {
		if (!message.Records) {
			return;
		}

		for (const record of message.Records) {
			const key = record.s3.object.key;
			const match = key.match(SCAN_KEY_PATTERN);

			if (!match?.groups) {
				throw new InvalidScanKey(key);
			}

			await this.processScanUseCase.execute({
				accountId: match.groups.accountId!,
				scanId: match.groups.scanId!
			});
		}
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
}
