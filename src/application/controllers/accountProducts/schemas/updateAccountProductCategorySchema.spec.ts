import {
	updateAccountProductCategoryBodySchema,
	updateAccountProductCategoryParamsSchema
} from '@application/controllers/accountProducts/schemas/updateAccountProductCategorySchema';
import { Receipt } from '@application/entities/Receipt';
import { ARROZ_PRODUCT_KEY } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

describe('updateAccountProductCategoryParamsSchema', () => {
	it('should accept a bare sha1 product key', () => {
		expect(
			updateAccountProductCategoryParamsSchema.parse({
				productKey: ARROZ_PRODUCT_KEY
			}).productKey
		).toBe(ARROZ_PRODUCT_KEY);
	});

	it('should refuse a key with the wrong length', () => {
		expect(
			updateAccountProductCategoryParamsSchema.safeParse({
				productKey: 'a'.repeat(39)
			}).success
		).toBe(false);
	});

	it('should refuse a key that is not lowercase hex', () => {
		expect(
			updateAccountProductCategoryParamsSchema.safeParse({
				productKey: ARROZ_PRODUCT_KEY.toUpperCase()
			}).success
		).toBe(false);
	});

	it('should refuse a key carrying an entity prefix', () => {
		expect(
			updateAccountProductCategoryParamsSchema.safeParse({
				productKey: `PRODUCT#${ARROZ_PRODUCT_KEY}`
			}).success
		).toBe(false);
	});
});

describe('updateAccountProductCategoryBodySchema', () => {
	it('should accept a category of the domain', () => {
		expect(
			updateAccountProductCategoryBodySchema.parse({
				category: Receipt.ProductCategory.SNACKS
			}).category
		).toBe(Receipt.ProductCategory.SNACKS);
	});

	it('should refuse a category outside the domain', () => {
		expect(
			updateAccountProductCategoryBodySchema.safeParse({ category: 'CANDY' })
				.success
		).toBe(false);
	});
});
