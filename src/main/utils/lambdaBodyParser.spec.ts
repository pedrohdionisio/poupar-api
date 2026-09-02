import { BadRequest } from '@application/errors/http/BadRequest';
import { lambdaBodyParser } from '@main/utils/lambdaBodyParser';
import { describe, expect, it } from 'vitest';

describe('lambdaBodyParser', () => {
	it('should parse a JSON body', () => {
		expect(lambdaBodyParser('{"totalCents":2500}')).toEqual({
			totalCents: 2500
		});
	});

	it('should return an empty object when there is no body', () => {
		expect(lambdaBodyParser(undefined)).toEqual({});
		expect(lambdaBodyParser('')).toEqual({});
	});

	it('should reject a malformed body', () => {
		expect(() => lambdaBodyParser('{"totalCents":')).toThrow(BadRequest);
		expect(() => lambdaBodyParser('not json')).toThrow('Malformed body.');
	});
});
