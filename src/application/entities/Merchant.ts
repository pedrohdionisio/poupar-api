import { ulid } from 'ulid';

export class Merchant {
	static readonly cnpjPattern = /^\d{14}$/;

	readonly id: string;
	readonly accountId: string;
	readonly createdAt: Date;

	name: string;
	category: Merchant.Category;
	cnpj: string | null;
	purchaseCount: number;
	totalSpentCents: number;
	firstPurchaseAt: Date | null;
	lastPurchaseAt: Date | null;
	lastAppliedPurchaseId: string | null;
	updatedAt: Date;

	constructor(attr: Merchant.Attributes) {
		this.id = attr.id ?? ulid();
		this.accountId = attr.accountId;
		this.name = attr.name;
		this.category = attr.category;
		this.cnpj = attr.cnpj;
		this.purchaseCount = attr.purchaseCount ?? 0;
		this.totalSpentCents = attr.totalSpentCents ?? 0;
		this.firstPurchaseAt = attr.firstPurchaseAt ?? null;
		this.lastPurchaseAt = attr.lastPurchaseAt ?? null;
		this.lastAppliedPurchaseId = attr.lastAppliedPurchaseId ?? null;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}

	static isValidCnpj({ cnpj }: Merchant.IsValidCnpjParams): boolean {
		if (!Merchant.cnpjPattern.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
			return false;
		}

		const digits = [...cnpj].map(Number);

		return (
			Merchant.calculateCnpjCheckDigit({ digits: digits.slice(0, 12) }) ===
				digits[12] &&
			Merchant.calculateCnpjCheckDigit({ digits: digits.slice(0, 13) }) ===
				digits[13]
		);
	}

	private static calculateCnpjCheckDigit({
		digits
	}: Merchant.CalculateCnpjCheckDigitParams): number {
		let sum = 0;
		let weight = 2;

		for (let index = digits.length - 1; index >= 0; index--) {
			sum += digits[index] * weight;
			weight = weight === 9 ? 2 : weight + 1;
		}

		const rest = sum % 11;

		return rest < 2 ? 0 : 11 - rest;
	}
}

export namespace Merchant {
	export enum Category {
		SUPERMARKET = 'SUPERMARKET',
		OTHER = 'OTHER'
	}

	export type IsValidCnpjParams = { cnpj: string };

	export type CalculateCnpjCheckDigitParams = { digits: number[] };

	export type Attributes = {
		id?: string;
		accountId: string;
		name: string;
		category: Merchant.Category;
		cnpj: string | null;
		purchaseCount?: number;
		totalSpentCents?: number;
		firstPurchaseAt?: Date | null;
		lastPurchaseAt?: Date | null;
		lastAppliedPurchaseId?: string | null;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
