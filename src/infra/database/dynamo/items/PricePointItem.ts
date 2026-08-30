import { PricePoint } from '@application/entities/PricePoint';
import { Receipt } from '@application/entities/Receipt';

export class PricePointItem {
	static readonly type = 'PricePoint';
	private readonly keys: PricePointItem.Keys;

	constructor(private readonly attr: PricePointItem.Attributes) {
		this.keys = {
			PK: PricePointItem.getPK({
				accountId: this.attr.accountId,
				productKey: this.attr.productKey
			}),
			SK: PricePointItem.getSK({
				purchasedAt: this.attr.purchasedAt,
				purchaseId: this.attr.purchaseId
			})
		};
	}

	toItem(): PricePointItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: PricePointItem.type
		};
	}

	static fromEntity({ entity }: PricePointItem.FromEntityParams) {
		return new PricePointItem({
			accountId: entity.accountId,
			productKey: entity.productKey,
			purchaseId: entity.purchaseId,
			purchasedAt: entity.purchasedAt.toISOString(),
			merchantId: entity.merchantId,
			unitPriceCents: entity.unitPriceCents,
			quantityMilli: entity.quantityMilli,
			unit: entity.unit
		});
	}

	static toEntity({ item }: PricePointItem.ToEntityParams) {
		return new PricePoint({
			accountId: item.accountId,
			productKey: item.productKey,
			purchaseId: item.purchaseId,
			purchasedAt: new Date(item.purchasedAt),
			merchantId: item.merchantId,
			unitPriceCents: item.unitPriceCents,
			quantityMilli: item.quantityMilli,
			unit: item.unit
		});
	}

	static getPK({
		accountId,
		productKey
	}: PricePointItem.GetPKParams): PricePointItem['keys']['PK'] {
		return `ACCOUNT#${accountId}#PRODUCT#${productKey}`;
	}

	static getSK({
		purchasedAt,
		purchaseId
	}: PricePointItem.GetSKParams): PricePointItem['keys']['SK'] {
		return `PRICE#${purchasedAt}#${purchaseId}`;
	}

	static getSKPrefix(): 'PRICE#' {
		return 'PRICE#';
	}
}

export namespace PricePointItem {
	export type FromEntityParams = {
		entity: PricePoint;
	};

	export type ToEntityParams = {
		item: PricePointItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}#PRODUCT#${string}`;
		SK: `PRICE#${string}#${string}`;
	};

	export type Attributes = {
		accountId: string;
		productKey: string;
		purchaseId: string;
		purchasedAt: string;
		merchantId: string;
		unitPriceCents: number;
		quantityMilli: number;
		unit: Receipt.Unit;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'PricePoint';
		};

	export type GetPKParams = {
		accountId: string;
		productKey: string;
	};

	export type GetSKParams = {
		purchasedAt: string;
		purchaseId: string;
	};
}
