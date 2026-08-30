import { createHash } from 'node:crypto';
import { Receipt } from '@application/entities/Receipt';

export class ImportPurchaseNormalizer {
	static readonly gtinPattern = /^(\d{8}|\d{12,14})$/;

	static normalize({
		items
	}: ImportPurchaseNormalizer.Input): ImportPurchaseNormalizer.Output {
		const consolidated = new Map<string, Receipt.Item>();

		for (const item of items) {
			const displayName = item.displayName?.trim() || item.description;
			const normalizedName = ImportPurchaseNormalizer.normalizeName({
				description: displayName
			});
			const productKey = ImportPurchaseNormalizer.resolveProductKey({
				normalizedName
			});

			const previous = consolidated.get(productKey);

			if (!previous) {
				consolidated.set(productKey, {
					seq: item.seq,
					productKey,
					description: item.description,
					displayName,
					normalizedName,
					gtin: ImportPurchaseNormalizer.resolveGtin({ gtin: item.gtin }),
					merchantCode: item.merchantCode?.trim() || null,
					quantityMilli: item.quantityMilli,
					unit: item.unit,
					unitPriceCents: item.unitPriceCents,
					totalCents: item.totalCents,
					discountCents: item.discountCents
				});

				continue;
			}

			previous.seq = Math.min(previous.seq, item.seq);
			previous.quantityMilli += item.quantityMilli;
			previous.totalCents += item.totalCents;
			previous.discountCents += item.discountCents;
			previous.unitPriceCents = ImportPurchaseNormalizer.divideUnitPrice({
				totalCents: previous.totalCents,
				quantityMilli: previous.quantityMilli
			});
		}

		const normalizedItems = [...consolidated.values()].sort(
			(a, b) => a.seq - b.seq
		);

		return {
			items: normalizedItems,
			itemCount: normalizedItems.length
		};
	}

	static normalizeName({
		description
	}: ImportPurchaseNormalizer.NormalizeNameParams): string {
		return description
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.toUpperCase();
	}

	static resolveProductKey({
		normalizedName
	}: ImportPurchaseNormalizer.ResolveProductKeyParams): string {
		return createHash('sha1').update(normalizedName).digest('hex');
	}

	static resolveGtin({
		gtin
	}: ImportPurchaseNormalizer.ResolveGtinParams): string | null {
		if (!gtin || !ImportPurchaseNormalizer.gtinPattern.test(gtin)) {
			return null;
		}

		return ImportPurchaseNormalizer.hasValidCheckDigit({ gtin }) ? gtin : null;
	}

	private static hasValidCheckDigit({
		gtin
	}: ImportPurchaseNormalizer.HasValidCheckDigitParams): boolean {
		const digits = [...gtin].map(Number);
		const checkDigit = digits[digits.length - 1];

		let sum = 0;
		let weight = 3;

		for (let index = digits.length - 2; index >= 0; index--) {
			sum += digits[index] * weight;
			weight = weight === 3 ? 1 : 3;
		}

		return (10 - (sum % 10)) % 10 === checkDigit;
	}

	private static divideUnitPrice({
		totalCents,
		quantityMilli
	}: ImportPurchaseNormalizer.DivideUnitPriceParams): number {
		if (quantityMilli <= 0) {
			return totalCents;
		}

		return Math.round((totalCents * 1000) / quantityMilli);
	}
}

export namespace ImportPurchaseNormalizer {
	export type PayloadItem = {
		seq: number;
		description: string;
		displayName?: string | null;
		merchantCode: string | null;
		gtin: string | null;
		quantityMilli: number;
		unit: Receipt.Unit;
		unitPriceCents: number;
		totalCents: number;
		discountCents: number;
	};

	export type Input = {
		items: PayloadItem[];
	};

	export type Output = {
		items: Receipt.Item[];
		itemCount: number;
	};

	export type NormalizeNameParams = { description: string };

	export type ResolveProductKeyParams = { normalizedName: string };

	export type ResolveGtinParams = { gtin: string | null };

	export type HasValidCheckDigitParams = { gtin: string };

	export type DivideUnitPriceParams = {
		totalCents: number;
		quantityMilli: number;
	};
}
