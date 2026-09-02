import { getBrazilMonth } from '@shared/utils/getBrazilMonth';
import { describe, expect, it } from 'vitest';

describe('getBrazilMonth', () => {
	it('should return the month of the Brazilian local date', () => {
		const month = getBrazilMonth({
			date: new Date('2026-02-19T15:30:00.000Z')
		});

		expect(month).toBe('2026-02');
	});

	it('should keep the previous month right before midnight in Brazil', () => {
		const month = getBrazilMonth({
			date: new Date('2026-03-01T02:59:59.999Z')
		});

		expect(month).toBe('2026-02');
	});

	it('should move to the next month exactly at midnight in Brazil', () => {
		const month = getBrazilMonth({
			date: new Date('2026-03-01T03:00:00.000Z')
		});

		expect(month).toBe('2026-03');
	});

	it('should roll the year back when the UTC date already turned', () => {
		const month = getBrazilMonth({
			date: new Date('2026-01-01T02:00:00.000Z')
		});

		expect(month).toBe('2025-12');
	});
});
