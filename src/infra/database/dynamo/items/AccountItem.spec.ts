import { Account } from '@application/entities/Account';
import { AccountItem } from '@infra/database/dynamo/items/AccountItem';
import { makeAccount } from '@test/factories/makeAccount';
import { ACCOUNT_ID } from '@test/fixtures';
import { describe, expect, it } from 'vitest';

describe('AccountItem.keys', () => {
	it('should partition every account under a fixed collection', () => {
		expect(AccountItem.getPK()).toBe('ACCOUNTS');
		expect(AccountItem.getSK({ id: ACCOUNT_ID })).toBe(`ACCOUNT#${ACCOUNT_ID}`);
	});

	it('should index accounts by role on GSI1', () => {
		expect(AccountItem.getGSI1PK()).toBe('ACCOUNTS');
		expect(AccountItem.getGSI1SK({ role: Account.Role.ADMIN })).toBe(
			'ACCOUNT#ADMIN'
		);
	});

	it('should index accounts by email on GSI2', () => {
		expect(AccountItem.getGSI2PK({ email: 'pedro@poupar.app' })).toBe(
			'ACCOUNT#pedro@poupar.app'
		);
		expect(AccountItem.getGSI2SK({ email: 'pedro@poupar.app' })).toBe(
			'ACCOUNT#pedro@poupar.app'
		);
	});
});

describe('AccountItem.toItem', () => {
	it('should carry the keys, the attributes and the type discriminator', () => {
		const item = AccountItem.fromEntity({ entity: makeAccount() }).toItem();

		expect(item).toStrictEqual({
			PK: 'ACCOUNTS',
			SK: `ACCOUNT#${ACCOUNT_ID}`,
			GSI1PK: 'ACCOUNTS',
			GSI1SK: 'ACCOUNT#USER',
			GSI2PK: 'ACCOUNT#pedro@poupar.app',
			GSI2SK: 'ACCOUNT#pedro@poupar.app',
			type: 'Account',
			id: ACCOUNT_ID,
			name: 'Pedro',
			email: 'pedro@poupar.app',
			externalId: 'cognito-sub-123',
			role: Account.Role.USER,
			createdAt: '2026-01-15T10:00:00.000Z'
		});
	});

	it('should store the date as an ISO string', () => {
		const item = AccountItem.fromEntity({ entity: makeAccount() }).toItem();

		expect(item.createdAt).toBe('2026-01-15T10:00:00.000Z');
	});
});

describe('AccountItem round trip', () => {
	it('should rebuild the same account', () => {
		const account = makeAccount();

		const item = AccountItem.fromEntity({ entity: account }).toItem();

		expect(AccountItem.toEntity({ item })).toStrictEqual(account);
	});

	it('should rebuild an account that has no external id', () => {
		const account = makeAccount({ externalId: undefined });

		const item = AccountItem.fromEntity({ entity: account }).toItem();

		expect(AccountItem.toEntity({ item }).externalId).toBeUndefined();
	});
});
