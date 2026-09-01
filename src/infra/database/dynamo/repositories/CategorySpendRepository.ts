import { CategorySpend } from '@application/entities/CategorySpend';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { CategorySpendItem } from '../items/CategorySpendItem';

const SK_UPPER_BOUND = '￿';

@Injectable()
export class CategorySpendRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async listByPeriod({
		accountId,
		from,
		to
	}: CategorySpendRepository.ListByPeriodParams): Promise<CategorySpend[]> {
		const categorySpends: CategorySpendItem.ItemType[] = [];
		let exclusiveStartKey: Record<string, unknown> | undefined;

		do {
			const command = new QueryCommand({
				TableName: this.appConfig.database.dynamodb.mainTable,
				KeyConditionExpression: '#PK = :PK AND #SK BETWEEN :from AND :to',
				ExpressionAttributeNames: {
					'#PK': 'PK',
					'#SK': 'SK'
				},
				ExpressionAttributeValues: {
					':PK': CategorySpendItem.getPK({ accountId }),
					':from': CategorySpendItem.getSKPrefix({ month: from }),
					':to': `${CategorySpendItem.getSKPrefix({ month: to })}${SK_UPPER_BOUND}`
				},
				ExclusiveStartKey: exclusiveStartKey
			});

			const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);

			categorySpends.push(...(Items as CategorySpendItem.ItemType[]));
			exclusiveStartKey = LastEvaluatedKey;
		} while (exclusiveStartKey);

		return categorySpends.map((categorySpend) =>
			CategorySpendItem.toEntity({ item: categorySpend })
		);
	}

	async applyPurchase({
		accountId,
		purchaseId,
		month,
		entries
	}: CategorySpendRepository.ApplyPurchaseParams): Promise<void> {
		const now = new Date().toISOString();

		await Promise.all(
			entries.map(async (entry) => {
				const command = new UpdateCommand({
					TableName: this.appConfig.database.dynamodb.mainTable,
					Key: {
						PK: CategorySpendItem.getPK({ accountId }),
						SK: CategorySpendItem.getSK({ month, category: entry.category })
					},
					UpdateExpression: [
						'SET #type = :type,',
						'#accountId = :accountId,',
						'#month = :month,',
						'#category = :category,',
						'#createdAt = if_not_exists(#createdAt, :now),',
						'#lastAppliedPurchaseId = :purchaseId,',
						'#updatedAt = :now',
						'ADD #totalCents :totalCents, #itemCount :itemCount'
					].join(' '),
					ConditionExpression:
						'attribute_not_exists(SK) OR #lastAppliedPurchaseId <> :purchaseId',
					ExpressionAttributeNames: {
						'#type': 'type',
						'#accountId': 'accountId',
						'#month': 'month',
						'#category': 'category',
						'#createdAt': 'createdAt',
						'#lastAppliedPurchaseId': 'lastAppliedPurchaseId',
						'#updatedAt': 'updatedAt',
						'#totalCents': 'totalCents',
						'#itemCount': 'itemCount'
					},
					ExpressionAttributeValues: {
						':type': CategorySpendItem.type,
						':accountId': accountId,
						':month': month,
						':category': entry.category,
						':purchaseId': purchaseId,
						':now': now,
						':totalCents': entry.totalCents,
						':itemCount': entry.itemCount
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
			})
		);
	}

	async revertPurchase({
		accountId,
		month,
		entries
	}: CategorySpendRepository.RevertPurchaseParams): Promise<void> {
		const now = new Date().toISOString();

		await Promise.all(
			entries.map(async (entry) => {
				const command = new UpdateCommand({
					TableName: this.appConfig.database.dynamodb.mainTable,
					Key: {
						PK: CategorySpendItem.getPK({ accountId }),
						SK: CategorySpendItem.getSK({ month, category: entry.category })
					},
					UpdateExpression:
						'SET #updatedAt = :now ADD #totalCents :totalCents, #itemCount :itemCount',
					ConditionExpression: 'attribute_exists(SK)',
					ExpressionAttributeNames: {
						'#updatedAt': 'updatedAt',
						'#totalCents': 'totalCents',
						'#itemCount': 'itemCount'
					},
					ExpressionAttributeValues: {
						':now': now,
						':totalCents': -entry.totalCents,
						':itemCount': -entry.itemCount
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
			})
		);
	}
}

export namespace CategorySpendRepository {
	export type ListByPeriodParams = {
		accountId: string;
		from: string;
		to: string;
	};

	export type ApplyPurchaseParams = {
		accountId: string;
		purchaseId: string;
		month: string;
		entries: CategorySpend.Entry[];
	};

	export type RevertPurchaseParams = {
		accountId: string;
		month: string;
		entries: CategorySpend.Entry[];
	};
}
