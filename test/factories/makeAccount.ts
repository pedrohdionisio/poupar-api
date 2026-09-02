import { Account } from '@application/entities/Account';
import { ACCOUNT_ID } from '@test/fixtures';

export function makeAccount(overrides: Partial<Account.Attributes> = {}) {
	return new Account({
		id: ACCOUNT_ID,
		name: 'Pedro',
		email: 'pedro@poupar.app',
		externalId: 'cognito-sub-123',
		role: Account.Role.USER,
		createdAt: new Date('2026-01-15T10:00:00.000Z'),
		...overrides
	});
}
