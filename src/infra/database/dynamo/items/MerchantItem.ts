import { Merchant } from '@application/entities/Merchant';

export class MerchantItem {
	static readonly type = 'Merchant';
	private readonly keys: MerchantItem.Keys;

	constructor(private readonly attr: MerchantItem.Attributes) {
		this.keys = {
			PK: MerchantItem.getPK({ cnpj: this.attr.cnpj }),
			SK: MerchantItem.getSK({ cnpj: this.attr.cnpj }),
			GSI1PK: MerchantItem.getGSI1PK(),
			GSI1SK: MerchantItem.getGSI1SK({ cnpj: this.attr.cnpj })
		};
	}

	toItem(): MerchantItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: MerchantItem.type
		};
	}

	static fromEntity({ entity }: MerchantItem.FromEntityParams) {
		return new MerchantItem({
			cnpj: entity.cnpj,
			name: entity.name,
			fantasyName: entity.fantasyName,
			category: entity.category,
			address: entity.address,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString()
		});
	}

	static toEntity({ item }: MerchantItem.ToEntityParams) {
		return new Merchant({
			cnpj: item.cnpj,
			name: item.name,
			fantasyName: item.fantasyName,
			category: item.category,
			address: item.address,
			createdAt: new Date(item.createdAt),
			updatedAt: new Date(item.updatedAt)
		});
	}

	static getPK({ cnpj }: MerchantItem.GetPKParams): MerchantItem['keys']['PK'] {
		return `MERCHANT#${cnpj}`;
	}

	static getSK({ cnpj }: MerchantItem.GetSKParams): MerchantItem['keys']['SK'] {
		return `MERCHANT#${cnpj}`;
	}

	static getGSI1PK(): MerchantItem['keys']['GSI1PK'] {
		return 'MERCHANTS';
	}

	static getGSI1SK({
		cnpj
	}: MerchantItem.GetGSI1SKParams): MerchantItem['keys']['GSI1SK'] {
		return `MERCHANT#${cnpj}`;
	}
}

export namespace MerchantItem {
	export type FromEntityParams = {
		entity: Merchant;
	};

	export type ToEntityParams = {
		item: MerchantItem.ItemType;
	};

	export type Keys = {
		PK: `MERCHANT#${string}`;
		SK: `MERCHANT#${string}`;
		GSI1PK: 'MERCHANTS';
		GSI1SK: `MERCHANT#${string}`;
	};

	export type Attributes = {
		cnpj: string;
		name: string;
		fantasyName: string | null;
		category: Merchant.Category;
		address: string;
		createdAt: string;
		updatedAt: string;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'Merchant';
		};

	export type GetPKParams = {
		cnpj: string;
	};

	export type GetSKParams = {
		cnpj: string;
	};

	export type GetGSI1SKParams = {
		cnpj: string;
	};
}
