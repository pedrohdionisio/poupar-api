import { Saga } from '@shared/saga/Saga';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Saga', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
	});

	it('should return the result and keep compensations untouched on success', async () => {
		const saga = new Saga();
		const compensation = vi.fn(async () => undefined);

		saga.addCompensations(compensation);

		await expect(saga.run(async () => 'done')).resolves.toBe('done');
		expect(compensation).not.toHaveBeenCalled();
	});

	it('should rethrow the original error after compensating', async () => {
		const saga = new Saga();
		const error = new Error('boom');
		const compensation = vi.fn(async () => undefined);

		saga.addCompensations(compensation);

		await expect(
			saga.run(async () => {
				throw error;
			})
		).rejects.toBe(error);
		expect(compensation).toHaveBeenCalledOnce();
	});

	it('should compensate in the reverse order of registration', async () => {
		const saga = new Saga();
		const calls: string[] = [];

		saga.addCompensations(async () => {
			calls.push('first');
		});
		saga.addCompensations(async () => {
			calls.push('second');
		});
		saga.addCompensations(async () => {
			calls.push('third');
		});

		await saga.compensate();

		expect(calls).toEqual(['third', 'second', 'first']);
	});

	it('should keep compensating when one compensation throws', async () => {
		const saga = new Saga();
		const calls: string[] = [];

		saga.addCompensations(async () => {
			calls.push('first');
		});
		saga.addCompensations(async () => {
			throw new Error('compensation failed');
		});

		await expect(saga.compensate()).resolves.toBeUndefined();
		expect(calls).toEqual(['first']);
	});
});
