import { AccountMerchant } from '@application/entities/AccountMerchant';
import { Merchant } from '@application/entities/Merchant';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
	DeleteCommand,
	GetCommand,
	QueryCommand,
	UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { AccountMerchantItem } from '../items/AccountMerchantItem';

@Injectable()
export class AccountMerchantRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getByCnpj({
		accountId,
		cnpj
	}: AccountMerchantRepository.GetByCnpjParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountMerchantItem.getPK({ accountId }),
				SK: AccountMerchantItem.getSK({ cnpj })
			}
		});

		const { Item: accountMerchantItem } = await dynamoClient.send(command);

		if (!accountMerchantItem) {
			return null;
		}

		return AccountMerchantItem.toEntity({
			item: { ...(accountMerchantItem as AccountMerchantItem.ItemType) }
		});
	}

	async listByAccount({
		accountId
	}: AccountMerchantRepository.ListByAccountParams): Promise<
		AccountMerchant[]
	> {
		const command = new QueryCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SKPrefix)',
			ExpressionAttributeNames: {
				'#PK': 'PK',
				'#SK': 'SK'
			},
			ExpressionAttributeValues: {
				':PK': AccountMerchantItem.getPK({ accountId }),
				':SKPrefix': AccountMerchantItem.getSKPrefix()
			}
		});

		const { Items = [] } = await dynamoClient.send(command);
		const accountMerchants = Items as AccountMerchantItem.ItemType[];

		return accountMerchants.map((accountMerchant) =>
			AccountMerchantItem.toEntity({ item: accountMerchant })
		);
	}

	async applyPurchase({
		accountId,
		cnpj,
		name,
		category,
		purchaseId,
		totalCents,
		purchasedAt
	}: AccountMerchantRepository.ApplyPurchaseParams): Promise<void> {
		const now = new Date().toISOString();
		const purchasedAtISO = purchasedAt.toISOString();

		const applyCountersCommand = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountMerchantItem.getPK({ accountId }),
				SK: AccountMerchantItem.getSK({ cnpj })
			},
			UpdateExpression: [
				'SET #type = :type,',
				'#accountId = :accountId,',
				'#merchantCnpj = :merchantCnpj,',
				'#name = :name,',
				'#category = :category,',
				'#alias = if_not_exists(#alias, :alias),',
				'#createdAt = if_not_exists(#createdAt, :now),',
				'#firstPurchaseAt = if_not_exists(#firstPurchaseAt, :purchasedAt),',
				'#lastPurchaseAt = if_not_exists(#lastPurchaseAt, :purchasedAt),',
				'#lastAppliedPurchaseId = :purchaseId,',
				'#updatedAt = :now',
				'ADD #purchaseCount :one, #totalSpentCents :totalCents'
			].join(' '),
			ConditionExpression:
				'attribute_not_exists(SK) OR #lastAppliedPurchaseId <> :purchaseId',
			ExpressionAttributeNames: {
				'#type': 'type',
				'#accountId': 'accountId',
				'#merchantCnpj': 'merchantCnpj',
				'#name': 'name',
				'#category': 'category',
				'#alias': 'alias',
				'#createdAt': 'createdAt',
				'#firstPurchaseAt': 'firstPurchaseAt',
				'#lastPurchaseAt': 'lastPurchaseAt',
				'#lastAppliedPurchaseId': 'lastAppliedPurchaseId',
				'#updatedAt': 'updatedAt',
				'#purchaseCount': 'purchaseCount',
				'#totalSpentCents': 'totalSpentCents'
			},
			ExpressionAttributeValues: {
				':type': AccountMerchantItem.type,
				':accountId': accountId,
				':merchantCnpj': cnpj,
				':name': name,
				':category': category,
				':alias': null,
				':now': now,
				':purchasedAt': purchasedAtISO,
				':purchaseId': purchaseId,
				':one': 1,
				':totalCents': totalCents
			}
		});

		try {
			await dynamoClient.send(applyCountersCommand);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				return;
			}

			throw error;
		}

		const boundaryCommands = [
			{ attribute: 'firstPurchaseAt', comparison: '>' },
			{ attribute: 'lastPurchaseAt', comparison: '<' }
		].map(
			({ attribute, comparison }) =>
				new UpdateCommand({
					TableName: this.appConfig.database.dynamodb.mainTable,
					Key: {
						PK: AccountMerchantItem.getPK({ accountId }),
						SK: AccountMerchantItem.getSK({ cnpj })
					},
					UpdateExpression: 'SET #boundary = :purchasedAt, #updatedAt = :now',
					ConditionExpression: `#boundary ${comparison} :purchasedAt`,
					ExpressionAttributeNames: {
						'#boundary': attribute,
						'#updatedAt': 'updatedAt'
					},
					ExpressionAttributeValues: {
						':purchasedAt': purchasedAtISO,
						':now': now
					}
				})
		);

		await Promise.all(
			boundaryCommands.map(async (command) => {
				try {
					await dynamoClient.send(command);
				} catch (error) {
					if (error instanceof ConditionalCheckFailedException) {
						return;
					}

					throw error;
				}
			})
		);
	}

	async adjustTotals({
		accountId,
		cnpj,
		purchaseCountDelta,
		totalCentsDelta
	}: AccountMerchantRepository.AdjustTotalsParams): Promise<void> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountMerchantItem.getPK({ accountId }),
				SK: AccountMerchantItem.getSK({ cnpj })
			},
			UpdateExpression:
				'SET #updatedAt = :now ADD #purchaseCount :purchaseCountDelta, #totalSpentCents :totalCentsDelta',
			ConditionExpression: 'attribute_exists(SK)',
			ExpressionAttributeNames: {
				'#updatedAt': 'updatedAt',
				'#purchaseCount': 'purchaseCount',
				'#totalSpentCents': 'totalSpentCents'
			},
			ExpressionAttributeValues: {
				':now': new Date().toISOString(),
				':purchaseCountDelta': purchaseCountDelta,
				':totalCentsDelta': totalCentsDelta
			}
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				return;
			}

			throw error;
		}
	}

	async deleteIfEmpty({
		accountId,
		cnpj
	}: AccountMerchantRepository.DeleteIfEmptyParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountMerchantItem.getPK({ accountId }),
				SK: AccountMerchantItem.getSK({ cnpj })
			},
			ConditionExpression: '#purchaseCount <= :zero',
			ExpressionAttributeNames: {
				'#purchaseCount': 'purchaseCount'
			},
			ExpressionAttributeValues: {
				':zero': 0
			}
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				return;
			}

			throw error;
		}
	}

	async updateAlias({
		accountId,
		cnpj,
		alias
	}: AccountMerchantRepository.UpdateAliasParams): Promise<void> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountMerchantItem.getPK({ accountId }),
				SK: AccountMerchantItem.getSK({ cnpj })
			},
			UpdateExpression: 'SET #alias = :alias, #updatedAt = :updatedAt',
			ConditionExpression: 'attribute_exists(PK)',
			ExpressionAttributeNames: {
				'#alias': 'alias',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':alias': alias,
				':updatedAt': new Date().toISOString()
			}
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new ResourceNotFound('Account merchant not found.');
			}

			throw error;
		}
	}

	async delete({
		accountId,
		cnpj
	}: AccountMerchantRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountMerchantItem.getPK({ accountId }),
				SK: AccountMerchantItem.getSK({ cnpj })
			}
		});

		await dynamoClient.send(command);
	}
}

export namespace AccountMerchantRepository {
	export type GetByCnpjParams = {
		accountId: string;
		cnpj: string;
	};

	export type ListByAccountParams = {
		accountId: string;
	};

	export type ApplyPurchaseParams = {
		accountId: string;
		cnpj: string;
		name: string;
		category: Merchant.Category;
		purchaseId: string;
		totalCents: number;
		purchasedAt: Date;
	};

	export type AdjustTotalsParams = {
		accountId: string;
		cnpj: string;
		purchaseCountDelta: number;
		totalCentsDelta: number;
	};

	export type DeleteIfEmptyParams = {
		accountId: string;
		cnpj: string;
	};

	export type UpdateAliasParams = {
		accountId: string;
		cnpj: string;
		alias: string | null;
	};

	export type DeleteParams = {
		accountId: string;
		cnpj: string;
	};
}
