import { Saga } from '@shared/saga/Saga';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Saga', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	it('should return the result without compensating on success', async () => {
		const saga = new Saga();
		const compensation = vi.fn(async () => undefined);

		await expect(
			saga.run(async () => {
				saga.addCompensations(compensation);

				return 'done';
			})
		).resolves.toBe('done');
		expect(compensation).not.toHaveBeenCalled();
	});

	it('should rethrow the original error after compensating', async () => {
		const saga = new Saga();
		const error = new Error('boom');
		const compensation = vi.fn(async () => undefined);

		saga.addCompensations(compensation);

		await expect(
			saga.run(async () => {
				saga.addCompensations(compensation);

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

	it('should not compensate a previous successful run when a later run fails', async () => {
		const saga = new Saga();
		const firstCompensation = vi.fn(async () => undefined);
		const secondCompensation = vi.fn(async () => undefined);

		await saga.run(async () => {
			saga.addCompensations(firstCompensation);
		});

		await expect(
			saga.run(async () => {
				saga.addCompensations(secondCompensation);

				throw new Error('boom');
			})
		).rejects.toThrow('boom');

		expect(firstCompensation).not.toHaveBeenCalled();
		expect(secondCompensation).toHaveBeenCalledOnce();
	});

	it('should not run the same compensation twice across failed runs', async () => {
		const saga = new Saga();
		const compensation = vi.fn(async () => undefined);

		await expect(
			saga.run(async () => {
				saga.addCompensations(compensation);

				throw new Error('boom');
			})
		).rejects.toThrow('boom');

		await expect(
			saga.run(async () => {
				throw new Error('boom again');
			})
		).rejects.toThrow('boom again');

		expect(compensation).toHaveBeenCalledOnce();
	});
});
