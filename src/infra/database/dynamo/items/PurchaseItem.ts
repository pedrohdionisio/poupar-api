import { Merchant } from '@application/entities/Merchant';
import { Purchase } from '@application/entities/Purchase';

export class PurchaseItem {
	static readonly type = 'Purchase';
	private readonly keys: PurchaseItem.Keys;

	constructor(private readonly attr: PurchaseItem.Attributes) {
		this.keys = {
			PK: PurchaseItem.getPK({ accountId: this.attr.accountId }),
			SK: PurchaseItem.getSK({
				purchasedAt: this.attr.purchasedAt,
				id: this.attr.id
			})
		};
	}

	toItem(): PurchaseItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: PurchaseItem.type
		};
	}

	static fromEntity({ entity }: PurchaseItem.FromEntityParams) {
		return new PurchaseItem({
			id: entity.id,
			accountId: entity.accountId,
			purchasedAt: entity.purchasedAt.toISOString(),
			merchantCnpj: entity.merchantCnpj,
			merchantName: entity.merchantName,
			category: entity.category,
			totalCents: entity.totalCents,
			discountCents: entity.discountCents,
			itemCount: entity.itemCount,
			accessKey: entity.accessKey,
			source: entity.source,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: PurchaseItem.ToEntityParams) {
		return new Purchase({
			id: item.id,
			accountId: item.accountId,
			purchasedAt: new Date(item.purchasedAt),
			merchantCnpj: item.merchantCnpj,
			merchantName: item.merchantName,
			category: item.category,
			totalCents: item.totalCents,
			discountCents: item.discountCents,
			itemCount: item.itemCount,
			accessKey: item.accessKey,
			source: item.source,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({
		accountId
	}: PurchaseItem.GetPKParams): PurchaseItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({
		purchasedAt,
		id
	}: PurchaseItem.GetSKParams): PurchaseItem['keys']['SK'] {
		return `PURCHASE#${purchasedAt}#${id}`;
	}

	static getSKPrefix(): 'PURCHASE#' {
		return 'PURCHASE#';
	}

	static getSKFrom({
		from
	}: PurchaseItem.GetSKFromParams): `PURCHASE#${string}` {
		return `PURCHASE#${from}`;
	}

	static getSKTo({ to }: PurchaseItem.GetSKToParams): `PURCHASE#${string}` {
		return `PURCHASE#${to}#￿`;
	}
}

export namespace PurchaseItem {
	export type FromEntityParams = {
		entity: Purchase;
	};

	export type ToEntityParams = {
		item: PurchaseItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `PURCHASE#${string}#${string}`;
	};

	export type Attributes = {
		id: string;
		accountId: string;
		purchasedAt: string;
		merchantCnpj: string;
		merchantName: string;
		category: Merchant.Category;
		totalCents: number;
		discountCents: number;
		itemCount: number;
		accessKey: string | null;
		source: Purchase.Source;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'Purchase';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		purchasedAt: string;
		id: string;
	};

	export type GetSKFromParams = {
		from: string;
	};

	export type GetSKToParams = {
		to: string;
	};
}
