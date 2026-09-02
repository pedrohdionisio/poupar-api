import { listCategorySpendsQuerySchema } from '@application/controllers/categorySpends/schemas/listCategorySpendsSchema';
import { describe, expect, it } from 'vitest';

describe('listCategorySpendsQuerySchema', () => {
	it('should accept a period in the YYYY-MM format', () => {
		expect(
			listCategorySpendsQuerySchema.parse({ from: '2026-01', to: '2026-03' })
		).toEqual({ from: '2026-01', to: '2026-03' });
	});

	it('should accept a single month period', () => {
		expect(
			listCategorySpendsQuerySchema.safeParse({
				from: '2026-02',
				to: '2026-02'
			}).success
		).toBe(true);
	});

	it('should refuse a period that ends before it starts', () => {
		const result = listCategorySpendsQuerySchema.safeParse({
			from: '2026-03',
			to: '2026-01'
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe(
			'"from" must not be after "to"'
		);
	});

	it('should refuse a month outside 01 to 12', () => {
		expect(
			listCategorySpendsQuerySchema.safeParse({
				from: '2026-00',
				to: '2026-03'
			}).success
		).toBe(false);
		expect(
			listCategorySpendsQuerySchema.safeParse({
				from: '2026-01',
				to: '2026-13'
			}).success
		).toBe(false);
	});

	it('should refuse a full date', () => {
		expect(
			listCategorySpendsQuerySchema.safeParse({
				from: '2026-01-01',
				to: '2026-03-01'
			}).success
		).toBe(false);
	});

	it('should require both ends of the period', () => {
		expect(
			listCategorySpendsQuerySchema.safeParse({ from: '2026-01' }).success
		).toBe(false);
	});
});
