import type { IQueueConsumer } from '@application/contracts/IQueueConsumer';
import type { SQSEvent } from 'aws-lambda';

export function lambdaSQSAdapter(consumer: IQueueConsumer<any>) {
	return async (event: SQSEvent): Promise<void> => {
		for (const record of event.Records) {
			try {
				await consumer.process(JSON.parse(record.body));
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: <>
				console.error(`Failed to process message ${record.messageId}`, error);

				throw error;
			}
		}
	};
}
