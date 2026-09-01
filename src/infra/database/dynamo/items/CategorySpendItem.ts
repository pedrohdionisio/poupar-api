import { CategorySpend } from '@application/entities/CategorySpend';
import { Receipt } from '@application/entities/Receipt';

export class CategorySpendItem {
	static readonly type = 'CategorySpend';
	private readonly keys: CategorySpendItem.Keys;

	constructor(private readonly attr: CategorySpendItem.Attributes) {
		this.keys = {
			PK: CategorySpendItem.getPK({ accountId: this.attr.accountId }),
			SK: CategorySpendItem.getSK({
				month: this.attr.month,
				category: this.attr.category
			})
		};
	}

	toItem(): CategorySpendItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: CategorySpendItem.type
		};
	}

	static fromEntity({ entity }: CategorySpendItem.FromEntityParams) {
		return new CategorySpendItem({
			accountId: entity.accountId,
			month: entity.month,
			category: entity.category,
			totalCents: entity.totalCents,
			itemCount: entity.itemCount,
			lastAppliedPurchaseId: entity.lastAppliedPurchaseId,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: CategorySpendItem.ToEntityParams) {
		return new CategorySpend({
			accountId: item.accountId,
			month: item.month,
			category: item.category,
			totalCents: item.totalCents,
			itemCount: item.itemCount,
			lastAppliedPurchaseId: item.lastAppliedPurchaseId,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({
		accountId
	}: CategorySpendItem.GetPKParams): CategorySpendItem['keys']['PK'] {
		return `ACCOUNT#${accountId}`;
	}

	static getSK({
		month,
		category
	}: CategorySpendItem.GetSKParams): CategorySpendItem['keys']['SK'] {
		return `CATEGORY_SPEND#${month}#${category}`;
	}

	static getSKPrefix({ month }: CategorySpendItem.GetSKPrefixParams): string {
		return `CATEGORY_SPEND#${month}`;
	}
}

export namespace CategorySpendItem {
	export type FromEntityParams = {
		entity: CategorySpend;
	};

	export type ToEntityParams = {
		item: CategorySpendItem.ItemType;
	};

	export type Keys = {
		PK: `ACCOUNT#${string}`;
		SK: `CATEGORY_SPEND#${string}#${string}`;
	};

	export type Attributes = {
		accountId: string;
		month: string;
		category: Receipt.ProductCategory;
		totalCents: number;
		itemCount: number;
		lastAppliedPurchaseId: string | null;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'CategorySpend';
		};

	export type GetPKParams = {
		accountId: string;
	};

	export type GetSKParams = {
		month: string;
		category: Receipt.ProductCategory;
	};

	export type GetSKPrefixParams = {
		month: string;
	};
}
