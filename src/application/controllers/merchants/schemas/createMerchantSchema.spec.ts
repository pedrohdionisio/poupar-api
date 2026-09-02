import { createMerchantBodySchema } from '@application/controllers/merchants/schemas/createMerchantSchema';
import { Merchant } from '@application/entities/Merchant';
import { describe, expect, it } from 'vitest';

function makeBody(overrides: Record<string, unknown> = {}) {
	return {
		name: 'Supermercado Bom Preço',
		category: Merchant.Category.SUPERMARKET,
		...overrides
	};
}

describe('createMerchantBodySchema', () => {
	it('should treat the CNPJ as optional and default it to null', () => {
		expect(createMerchantBodySchema.parse(makeBody()).cnpj).toBeNull();
	});

	it('should accept a CNPJ with valid check digits', () => {
		expect(
			createMerchantBodySchema.parse(makeBody({ cnpj: '11222333000181' })).cnpj
		).toBe('11222333000181');
	});

	it('should refuse a CNPJ with wrong check digits', () => {
		const result = createMerchantBodySchema.safeParse(
			makeBody({ cnpj: '11222333000182' })
		);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe(
			'"cnpj" has invalid check digits'
		);
	});

	it('should refuse a formatted CNPJ', () => {
		expect(
			createMerchantBodySchema.safeParse(
				makeBody({ cnpj: '11.222.333/0001-81' })
			).success
		).toBe(false);
	});

	it('should refuse an empty name', () => {
		expect(
			createMerchantBodySchema.safeParse(makeBody({ name: '' })).success
		).toBe(false);
	});

	it('should refuse an unknown category', () => {
		expect(
			createMerchantBodySchema.safeParse(makeBody({ category: 'PHARMACY' }))
				.success
		).toBe(false);
	});
});
