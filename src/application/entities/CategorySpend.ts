import { Receipt } from '@application/entities/Receipt';

export class CategorySpend {
	readonly accountId: string;
	readonly month: string;
	readonly category: Receipt.ProductCategory;
	readonly createdAt: Date;

	totalCents: number;
	itemCount: number;
	lastAppliedPurchaseId: string | null;
	updatedAt: Date;

	constructor(attr: CategorySpend.Attributes) {
		this.accountId = attr.accountId;
		this.month = attr.month;
		this.category = attr.category;
		this.totalCents = attr.totalCents;
		this.itemCount = attr.itemCount;
		this.lastAppliedPurchaseId = attr.lastAppliedPurchaseId;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}

	static toEntries({
		items
	}: CategorySpend.ToEntriesParams): CategorySpend.Entry[] {
		const entries = new Map<Receipt.ProductCategory, CategorySpend.Entry>();

		for (const item of items) {
			const entry = entries.get(item.category);

			if (!entry) {
				entries.set(item.category, {
					category: item.category,
					totalCents: item.totalCents,
					itemCount: 1
				});

				continue;
			}

			entry.totalCents += item.totalCents;
			entry.itemCount += 1;
		}

		return [...entries.values()];
	}
}

export namespace CategorySpend {
	export type ToEntriesParams = {
		items: Receipt.Item[];
	};

	export type Entry = {
		category: Receipt.ProductCategory;
		totalCents: number;
		itemCount: number;
	};

	export type Attributes = {
		accountId: string;
		month: string;
		category: Receipt.ProductCategory;
		totalCents: number;
		itemCount: number;
		lastAppliedPurchaseId: string | null;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
