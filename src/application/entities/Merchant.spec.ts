import { Merchant } from '@application/entities/Merchant';
import { describe, expect, it } from 'vitest';

describe('Merchant.isValidCnpj', () => {
	it('should accept a CNPJ with both check digits right', () => {
		expect(Merchant.isValidCnpj({ cnpj: '11222333000181' })).toBe(true);
		expect(Merchant.isValidCnpj({ cnpj: '33333333000191' })).toBe(true);
	});

	it('should reject a CNPJ with a wrong check digit', () => {
		expect(Merchant.isValidCnpj({ cnpj: '11222333000182' })).toBe(false);
		expect(Merchant.isValidCnpj({ cnpj: '11222333000191' })).toBe(false);
	});

	it('should reject a CNPJ made of a single repeated digit', () => {
		expect(Merchant.isValidCnpj({ cnpj: '11111111111111' })).toBe(false);
		expect(Merchant.isValidCnpj({ cnpj: '00000000000000' })).toBe(false);
	});

	it('should reject anything that is not 14 raw digits', () => {
		expect(Merchant.isValidCnpj({ cnpj: '11.222.333/0001-81' })).toBe(false);
		expect(Merchant.isValidCnpj({ cnpj: '1122233300018' })).toBe(false);
		expect(Merchant.isValidCnpj({ cnpj: '112223330001811' })).toBe(false);
		expect(Merchant.isValidCnpj({ cnpj: '' })).toBe(false);
	});
});
