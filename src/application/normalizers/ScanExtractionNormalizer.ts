import { Merchant } from '@application/entities/Merchant';
import { Receipt } from '@application/entities/Receipt';
import { Scan } from '@application/entities/Scan';
import { InvalidCnpj } from '@application/errors/application/InvalidCnpj';
import { ReceiptNotParsed } from '@application/errors/application/ReceiptNotParsed';
import { ImportPurchaseNormalizer } from '@application/normalizers/ImportPurchaseNormalizer';
import type { ReceiptExtractionGateway } from '@infra/gateways/ReceiptExtractionGateway';

const CENTS_SCALE = 2;
const MILLI_SCALE = 3;
const ACCESS_KEY_LENGTH = 44;
const BRAZIL_OFFSET_IN_MINUTES = 180;

export class ScanExtractionNormalizer {
	static toDraft({
		extraction
	}: ScanExtractionNormalizer.ToDraftParams): Scan.Draft {
		const cnpj = extraction.merchant.cnpj.replace(/\D/g, '');

		if (!Merchant.isValidCnpj({ cnpj })) {
			throw new InvalidCnpj(cnpj);
		}

		const accessKey = extraction.accessKey.replace(/\D/g, '');

		return {
			purchasedAt: ScanExtractionNormalizer.toIsoDate({
				value: extraction.issuedAt
			}),
			accessKey: accessKey.length === ACCESS_KEY_LENGTH ? accessKey : null,
			merchant: {
				cnpj,
				name: extraction.merchant.name.trim(),
				fantasyName: extraction.merchant.fantasyName.trim() || null,
				address: extraction.merchant.address.trim()
			},
			totalCents: ScanExtractionNormalizer.toInt({
				value: extraction.total,
				scale: CENTS_SCALE
			}),
			discountCents: ScanExtractionNormalizer.toInt({
				value: extraction.discount,
				scale: CENTS_SCALE,
				fallback: 0
			}),
			items: extraction.items.map((item, index) => ({
				seq: item.seq || index + 1,
				description: item.description.trim(),
				merchantCode: item.merchantCode.trim() || null,
				gtin: ImportPurchaseNormalizer.resolveGtin({
					gtin: item.gtin.replace(/\D/g, '') || null
				}),
				quantityMilli: ScanExtractionNormalizer.toInt({
					value: item.quantity,
					scale: MILLI_SCALE
				}),
				unit: Receipt.Unit[item.unit],
				unitPriceCents: ScanExtractionNormalizer.toInt({
					value: item.unitPrice,
					scale: CENTS_SCALE
				}),
				totalCents: ScanExtractionNormalizer.toInt({
					value: item.total,
					scale: CENTS_SCALE
				}),
				discountCents: ScanExtractionNormalizer.toInt({
					value: item.discount,
					scale: CENTS_SCALE,
					fallback: 0
				})
			}))
		};
	}

	static toInt({
		value,
		scale,
		fallback
	}: ScanExtractionNormalizer.ToIntParams): number {
		const cleaned = value.replace(/[^\d.,]/g, '');

		if (!cleaned) {
			if (fallback === undefined) {
				throw new ReceiptNotParsed();
			}

			return fallback;
		}

		const { integer, fraction } = ScanExtractionNormalizer.split({
			cleaned,
			scale
		});
		const padded = `${fraction}${'0'.repeat(scale + 1)}`.slice(0, scale + 1);
		const base = Number(`${integer || '0'}${padded.slice(0, scale)}`);

		if (!Number.isSafeInteger(base)) {
			throw new ReceiptNotParsed();
		}

		return base + (Number(padded[scale]) >= 5 ? 1 : 0);
	}

	private static split({
		cleaned,
		scale
	}: ScanExtractionNormalizer.SplitParams): {
		integer: string;
		fraction: string;
	} {
		const lastComma = cleaned.lastIndexOf(',');

		if (lastComma !== -1) {
			return {
				integer: cleaned.slice(0, lastComma).replace(/\D/g, ''),
				fraction: cleaned.slice(lastComma + 1).replace(/\D/g, '')
			};
		}

		const lastDot = cleaned.lastIndexOf('.');
		const fraction = lastDot === -1 ? '' : cleaned.slice(lastDot + 1);
		const isDecimal =
			lastDot !== -1 &&
			cleaned.indexOf('.') === lastDot &&
			(fraction.length <= 2 || fraction.length === scale);

		if (!isDecimal) {
			return { integer: cleaned.replace(/\D/g, ''), fraction: '' };
		}

		return { integer: cleaned.slice(0, lastDot).replace(/\D/g, ''), fraction };
	}

	static toIsoDate({
		value
	}: ScanExtractionNormalizer.ToIsoDateParams): string {
		const brazilian = value.match(
			/(\d{2})\/(\d{2})\/(\d{4})(?:\D+(\d{2}):(\d{2})(?::(\d{2}))?)?/
		);
		const iso = value.match(
			/(\d{4})-(\d{2})-(\d{2})(?:\D+(\d{2}):(\d{2})(?::(\d{2}))?)?/
		);

		const parts = brazilian
			? [brazilian[3], brazilian[2], brazilian[1], ...brazilian.slice(4, 7)]
			: iso
				? [iso[1], iso[2], iso[3], ...iso.slice(4, 7)]
				: null;

		if (!parts) {
			throw new ReceiptNotParsed();
		}

		const [year, month, day, hours, minutes, seconds] = parts.map((part) =>
			Number(part ?? 0)
		);

		const timestamp = Date.UTC(
			year!,
			month! - 1,
			day!,
			hours!,
			minutes!,
			seconds!
		);

		if (Number.isNaN(timestamp)) {
			throw new ReceiptNotParsed();
		}

		return new Date(
			timestamp + BRAZIL_OFFSET_IN_MINUTES * 60 * 1000
		).toISOString();
	}
}

export namespace ScanExtractionNormalizer {
	export type ToDraftParams = {
		extraction: ReceiptExtractionGateway.Extraction;
	};

	export type ToIntParams = {
		value: string;
		scale: number;
		fallback?: number;
	};

	export type SplitParams = {
		cleaned: string;
		scale: number;
	};

	export type ToIsoDateParams = {
		value: string;
	};
}
