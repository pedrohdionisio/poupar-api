import { GlobalPricePoint } from '@application/entities/GlobalPricePoint';
import { Receipt } from '@application/entities/Receipt';

export class GlobalPricePointItem {
	static readonly type = 'GlobalPricePoint';
	static readonly productKeyPrefix = 'GTIN#';
	private readonly keys: GlobalPricePointItem.Keys;

	constructor(private readonly attr: GlobalPricePointItem.Attributes) {
		this.keys = {
			PK: GlobalPricePointItem.getPK({
				gtin: GlobalPricePointItem.getGtin({
					productKey: this.attr.productKey
				})
			}),
			SK: GlobalPricePointItem.getSK({
				purchasedAt: this.attr.purchasedAt,
				merchantCnpj: this.attr.merchantCnpj
			})
		};
	}

	toItem(): GlobalPricePointItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: GlobalPricePointItem.type
		};
	}

	static fromEntity({ entity }: GlobalPricePointItem.FromEntityParams) {
		return new GlobalPricePointItem({
			productKey: entity.productKey,
			purchasedAt: entity.purchasedAt.toISOString(),
			merchantCnpj: entity.merchantCnpj,
			unitPriceCents: entity.unitPriceCents,
			unit: entity.unit,
			city: entity.city,
			uf: entity.uf
		});
	}

	static toEntity({ item }: GlobalPricePointItem.ToEntityParams) {
		return new GlobalPricePoint({
			productKey: item.productKey,
			purchasedAt: new Date(item.purchasedAt),
			merchantCnpj: item.merchantCnpj,
			unitPriceCents: item.unitPriceCents,
			unit: item.unit,
			city: item.city,
			uf: item.uf
		});
	}

	static getGtin({ productKey }: GlobalPricePointItem.GetGtinParams): string {
		if (!productKey.startsWith(GlobalPricePointItem.productKeyPrefix)) {
			throw new Error(
				`GlobalPricePoint requires a GTIN product key, received "${productKey}".`
			);
		}

		return productKey.slice(GlobalPricePointItem.productKeyPrefix.length);
	}

	static getPK({
		gtin
	}: GlobalPricePointItem.GetPKParams): GlobalPricePointItem['keys']['PK'] {
		return `PRODUCT#${gtin}`;
	}

	static getSK({
		purchasedAt,
		merchantCnpj
	}: GlobalPricePointItem.GetSKParams): GlobalPricePointItem['keys']['SK'] {
		return `PRICE#${purchasedAt}#${merchantCnpj}`;
	}

	static getSKPrefix(): 'PRICE#' {
		return 'PRICE#';
	}
}

export namespace GlobalPricePointItem {
	export type FromEntityParams = {
		entity: GlobalPricePoint;
	};

	export type ToEntityParams = {
		item: GlobalPricePointItem.ItemType;
	};

	export type Keys = {
		PK: `PRODUCT#${string}`;
		SK: `PRICE#${string}#${string}`;
	};

	export type Attributes = {
		productKey: string;
		purchasedAt: string;
		merchantCnpj: string;
		unitPriceCents: number;
		unit: Receipt.Unit;
		city: string;
		uf: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'GlobalPricePoint';
		};

	export type GetGtinParams = {
		productKey: string;
	};

	export type GetPKParams = {
		gtin: string;
	};

	export type GetSKParams = {
		purchasedAt: string;
		merchantCnpj: string;
	};
}
