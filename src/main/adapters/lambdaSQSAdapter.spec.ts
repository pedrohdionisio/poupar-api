import type { IQueueConsumer } from '@application/contracts/IQueueConsumer';
import { lambdaSQSAdapter } from '@main/adapters/lambdaSQSAdapter';
import type { SQSEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Message = { accountId: string; scanId: string };

function makeEvent(messages: Message[]): SQSEvent {
	return {
		Records: messages.map((message, index) => ({
			messageId: `message-${index}`,
			body: JSON.stringify(message)
		}))
	} as SQSEvent;
}

function makeConsumer(process = vi.fn(async () => undefined)) {
	return { process } as unknown as IQueueConsumer<Message> & {
		process: typeof process;
	};
}

describe('lambdaSQSAdapter', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('should hand the parsed message to the consumer', async () => {
		const consumer = makeConsumer();

		await lambdaSQSAdapter(consumer)(
			makeEvent([{ accountId: 'account', scanId: 'scan' }])
		);

		expect(consumer.process).toHaveBeenCalledWith({
			accountId: 'account',
			scanId: 'scan'
		});
	});

	it('should process every record of the batch', async () => {
		const consumer = makeConsumer();

		await lambdaSQSAdapter(consumer)(
			makeEvent([
				{ accountId: 'account', scanId: 'first' },
				{ accountId: 'account', scanId: 'second' }
			])
		);

		expect(consumer.process).toHaveBeenCalledTimes(2);
	});

	it('should rethrow so the message goes back to the queue', async () => {
		const error = new Error('scan not found');
		const consumer = makeConsumer(
			vi.fn(async () => {
				throw error;
			})
		);

		await expect(
			lambdaSQSAdapter(consumer)(
				makeEvent([{ accountId: 'account', scanId: 'scan' }])
			)
		).rejects.toBe(error);
	});

	it('should stop the batch at the first failure', async () => {
		const process = vi.fn(async () => {
			throw new Error('boom');
		});
		const consumer = makeConsumer(process);

		await expect(
			lambdaSQSAdapter(consumer)(
				makeEvent([
					{ accountId: 'account', scanId: 'first' },
					{ accountId: 'account', scanId: 'second' }
				])
			)
		).rejects.toThrow('boom');
		expect(process).toHaveBeenCalledTimes(1);
	});
});
