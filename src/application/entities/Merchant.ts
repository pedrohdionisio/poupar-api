export class Merchant {
	readonly cnpj: string;
	readonly createdAt: Date;

	name: string;
	fantasyName: string | null;
	category: Merchant.Category;
	address: string;
	updatedAt: Date;

	constructor(attr: Merchant.Attributes) {
		this.cnpj = attr.cnpj;
		this.name = attr.name;
		this.fantasyName = attr.fantasyName;
		this.category = attr.category;
		this.address = attr.address;
		this.createdAt = attr.createdAt ?? new Date();
		this.updatedAt = attr.updatedAt ?? new Date();
	}
}

export namespace Merchant {
	export enum Category {
		SUPERMARKET = 'SUPERMARKET',
		OTHER = 'OTHER'
	}

	export type Attributes = {
		cnpj: string;
		name: string;
		fantasyName: string | null;
		category: Merchant.Category;
		address: string;
		createdAt?: Date;
		updatedAt?: Date;
	};
}
