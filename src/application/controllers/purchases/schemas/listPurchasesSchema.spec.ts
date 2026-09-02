import { listPurchasesQuerySchema } from '@application/controllers/purchases/schemas/listPurchasesSchema';
import { describe, expect, it } from 'vitest';

describe('listPurchasesQuerySchema', () => {
	it('should accept an empty query', () => {
		expect(listPurchasesQuerySchema.safeParse({}).success).toBe(true);
	});

	it('should coerce the limit that arrives as a string', () => {
		const query = listPurchasesQuerySchema.parse({ limit: '10' });

		expect(query.limit).toBe(10);
	});

	it('should cap the limit at one hundred', () => {
		expect(listPurchasesQuerySchema.safeParse({ limit: '100' }).success).toBe(
			true
		);
		expect(listPurchasesQuerySchema.safeParse({ limit: '101' }).success).toBe(
			false
		);
	});

	it('should refuse a limit that is not a positive integer', () => {
		expect(listPurchasesQuerySchema.safeParse({ limit: '0' }).success).toBe(
			false
		);
		expect(listPurchasesQuerySchema.safeParse({ limit: '1.5' }).success).toBe(
			false
		);
	});

	it('should accept both ends of the period together', () => {
		expect(
			listPurchasesQuerySchema.safeParse({
				from: '2026-01-01T00:00:00.000Z',
				to: '2026-03-01T00:00:00.000Z'
			}).success
		).toBe(true);
	});

	it('should refuse half a period', () => {
		const result = listPurchasesQuerySchema.safeParse({
			from: '2026-01-01T00:00:00.000Z'
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe(
			'"from" and "to" must be provided together'
		);
	});
});
