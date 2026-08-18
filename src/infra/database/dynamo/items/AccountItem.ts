import { Account } from '@application/entities/Account';

export class AccountItem {
	static readonly type = 'Account';
	private readonly keys: AccountItem.Keys;

	constructor(private readonly attr: AccountItem.Attributes) {
		this.keys = {
			PK: AccountItem.getPK(),
			SK: AccountItem.getSK({ id: this.attr.id }),
			GSI1PK: AccountItem.getGSI1PK(),
			GSI1SK: AccountItem.getGSI1SK({ role: this.attr.role })
		};
	}

	toItem(): AccountItem.ItemType {
		return {
			...this.keys,
			...this.attr,
			type: AccountItem.type
		};
	}

	static fromEntity({ entity }: AccountItem.FromEntityParams) {
		return new AccountItem({
			...entity,
			createdAt: entity.createdAt.toISOString()
		});
	}

	static toEntity({ item }: AccountItem.ToEntityParams) {
		return new Account({
			id: item.id,
			email: item.email,
			name: item.name,
			externalId: item.externalId,
			role: item.role,
			createdAt: new Date(item.createdAt)
		});
	}

	static getPK(): AccountItem['keys']['PK'] {
		return 'ACCOUNTS';
	}

	static getSK({ id }: AccountItem.GetSKParams): AccountItem['keys']['SK'] {
		return `ACCOUNT#${id}`;
	}

	static getGSI1PK(): AccountItem['keys']['GSI1PK'] {
		return 'ACCOUNTS';
	}

	static getGSI1SK({
		role
	}: AccountItem.GetGSI1SKParams): AccountItem['keys']['GSI1SK'] {
		return `ACCOUNT#${role}`;
	}
}

export namespace AccountItem {
	export type FromEntityParams = {
		entity: Account;
	};

	export type ToEntityParams = {
		item: AccountItem.ItemType;
	};

	export type Keys = {
		PK: 'ACCOUNTS';
		SK: `ACCOUNT#${string}`;
		GSI1PK: 'ACCOUNTS';
		GSI1SK: `ACCOUNT#${string}`;
	};

	export type Attributes = {
		id: string;
		name: string;
		email: string;
		externalId: string | undefined;
		createdAt: string;
		role: Account.Role;
	};

	export type ItemType = Keys &
		Attributes & {
			type: 'Account';
		};

	export type GetSKParams = {
		id: string;
	};

	export type GetGSI1SKParams = {
		role: Account.Role;
	};
}
