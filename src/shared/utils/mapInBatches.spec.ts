import { mapInBatches } from '@shared/utils/mapInBatches';
import { describe, expect, it } from 'vitest';

describe('mapInBatches', () => {
	it('should return an empty list when there is nothing to map', async () => {
		const handler = async (item: number) => item;

		expect(await mapInBatches({ items: [], size: 3, handler })).toEqual([]);
	});

	it('should preserve the input order regardless of resolution order', async () => {
		const results = await mapInBatches({
			items: [1, 2, 3, 4, 5],
			size: 2,
			handler: async (item) => {
				await new Promise((resolve) => setTimeout(resolve, (5 - item) * 5));

				return item * 10;
			}
		});

		expect(results).toEqual([10, 20, 30, 40, 50]);
	});

	it('should never run more than "size" handlers at the same time', async () => {
		let inFlight = 0;
		let maxInFlight = 0;

		await mapInBatches({
			items: [1, 2, 3, 4, 5],
			size: 2,
			handler: async (item) => {
				inFlight++;
				maxInFlight = Math.max(maxInFlight, inFlight);

				await new Promise((resolve) => setTimeout(resolve, 1));

				inFlight--;

				return item;
			}
		});

		expect(maxInFlight).toBe(2);
	});

	it('should run a single batch when "size" is bigger than the list', async () => {
		let inFlight = 0;
		let maxInFlight = 0;

		const results = await mapInBatches({
			items: [1, 2, 3],
			size: 10,
			handler: async (item) => {
				inFlight++;
				maxInFlight = Math.max(maxInFlight, inFlight);

				await new Promise((resolve) => setTimeout(resolve, 1));

				inFlight--;

				return item;
			}
		});

		expect(results).toEqual([1, 2, 3]);
		expect(maxInFlight).toBe(3);
	});
});
