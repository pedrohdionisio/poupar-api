import { Account } from '@application/entities/Account';
import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	PutCommandInput,
	QueryCommand,
	UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { AccountItem } from '../items/AccountItem';

@Injectable()
export class AccountRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getById({ id }: AccountRepository.GetByIdParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountItem.getPK(),
				SK: AccountItem.getSK({ id })
			}
		});

		const { Item: accountItem } = await dynamoClient.send(command);

		if (!accountItem) {
			return null;
		}

		return AccountItem.toEntity({
			item: { ...(accountItem as AccountItem.ItemType) }
		});
	}

	getPutCommandInput({
		account
	}: AccountRepository.GetPutCommandInputParams): PutCommandInput {
		const accountItem = AccountItem.fromEntity({ entity: account });

		return {
			TableName: this.appConfig.database.dynamodb.mainTable,
			Item: accountItem.toItem()
		};
	}

	async create({ account }: AccountRepository.CreateParams): Promise<void> {
		await dynamoClient.send(
			new PutCommand(this.getPutCommandInput({ account }))
		);
	}

	async delete({ id }: AccountRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountItem.getPK(),
				SK: AccountItem.getSK({ id })
			}
		});

		await dynamoClient.send(command);
	}

	async list(): Promise<Account[]> {
		const command = new QueryCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			KeyConditionExpression: '#PK = :PK',
			ExpressionAttributeNames: {
				'#PK': 'PK'
			},
			ExpressionAttributeValues: {
				':PK': AccountItem.getPK()
			}
		});

		const { Items = [] } = await dynamoClient.send(command);
		const accounts = Items as AccountItem.ItemType[] | undefined;

		if (!accounts) {
			return [];
		}

		return accounts.map((account) => AccountItem.toEntity({ item: account }));
	}

	async update(account: AccountRepository.UpdateParams) {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountItem.getPK(),
				SK: AccountItem.getSK({ id: account.id })
			},
			UpdateExpression: 'SET #name = :name, #role = :role',
			ExpressionAttributeNames: {
				'#name': 'name',
				'#role': 'role'
			},
			ExpressionAttributeValues: {
				':name': account.name,
				':role': account.role
			}
		});

		await dynamoClient.send(command);
	}
}

export namespace AccountRepository {
	export type GetByIdParams = {
		id: string;
	};

	export type GetPutCommandInputParams = {
		account: Account;
	};

	export type CreateParams = {
		account: Account;
	};

	export type DeleteParams = {
		id: string;
	};

	export type UpdateParams = {
		id: string;
		name: string;
		role: Account.Role;
	};
}
