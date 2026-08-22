import { ulid } from 'ulid';

export class Account {
	readonly id: string;
	readonly email: string;
	readonly createdAt: Date;

	externalId: string | undefined;
	name: string;
	role: Account.Role;

	constructor(attr: Account.Attributes) {
		this.id = attr.id ?? ulid();
		this.externalId = attr.externalId;
		this.name = attr.name;
		this.email = attr.email;
		this.role = attr.role;
		this.createdAt = attr.createdAt ?? new Date();
	}
}

export namespace Account {
	export enum Role {
		ADMIN = 'ADMIN',
		USER = 'USER'
	}

	export type Attributes = {
		id?: string;
		externalId?: string;
		name: string;
		email: string;
		role: Account.Role;
		createdAt?: Date;
	};
}
