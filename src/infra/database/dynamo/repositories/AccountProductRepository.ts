import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
	BatchGetCommand,
	DeleteCommand,
	QueryCommand,
	UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { AccountProductItem } from '../items/AccountProductItem';

const BATCH_GET_SIZE = 100;

@Injectable()
export class AccountProductRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async listByAccount({
		accountId
	}: AccountProductRepository.ListByAccountParams): Promise<AccountProduct[]> {
		const accountProducts: AccountProductItem.ItemType[] = [];
		let exclusiveStartKey: Record<string, unknown> | undefined;

		do {
			const command = new QueryCommand({
				TableName: this.appConfig.database.dynamodb.mainTable,
				KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SKPrefix)',
				ExpressionAttributeNames: {
					'#PK': 'PK',
					'#SK': 'SK'
				},
				ExpressionAttributeValues: {
					':PK': AccountProductItem.getPK({ accountId }),
					':SKPrefix': AccountProductItem.getSKPrefix()
				},
				ExclusiveStartKey: exclusiveStartKey
			});

			const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);

			accountProducts.push(...(Items as AccountProductItem.ItemType[]));
			exclusiveStartKey = LastEvaluatedKey;
		} while (exclusiveStartKey);

		return accountProducts.map((accountProduct) =>
			AccountProductItem.toEntity({ item: accountProduct })
		);
	}

	async getByProductKeys({
		accountId,
		productKeys
	}: AccountProductRepository.GetByProductKeysParams): Promise<
		AccountProduct[]
	> {
		if (productKeys.length === 0) {
			return [];
		}

		const TableName = this.appConfig.database.dynamodb.mainTable;
		const accountProducts: AccountProductItem.ItemType[] = [];

		for (let index = 0; index < productKeys.length; index += BATCH_GET_SIZE) {
			let keys = productKeys
				.slice(index, index + BATCH_GET_SIZE)
				.map((productKey) => ({
					PK: AccountProductItem.getPK({ accountId }),
					SK: AccountProductItem.getSK({ productKey })
				}));

			while (keys.length > 0) {
				const command = new BatchGetCommand({
					RequestItems: { [TableName]: { Keys: keys } }
				});

				const { Responses, UnprocessedKeys } = await dynamoClient.send(command);

				accountProducts.push(
					...((Responses?.[TableName] ?? []) as AccountProductItem.ItemType[])
				);

				keys = (UnprocessedKeys?.[TableName]?.Keys ?? []) as typeof keys;
			}
		}

		return accountProducts.map((accountProduct) =>
			AccountProductItem.toEntity({ item: accountProduct })
		);
	}

	async updateCategory({
		accountId,
		productKey,
		category,
		categorySource
	}: AccountProductRepository.UpdateCategoryParams): Promise<boolean> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountProductItem.getPK({ accountId }),
				SK: AccountProductItem.getSK({ productKey })
			},
			UpdateExpression:
				'SET #category = :category, #categorySource = :categorySource, #updatedAt = :now',
			ConditionExpression: 'attribute_exists(SK)',
			ExpressionAttributeNames: {
				'#category': 'category',
				'#categorySource': 'categorySource',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':category': category,
				':categorySource': categorySource,
				':now': new Date().toISOString()
			}
		});

		try {
			await dynamoClient.send(command);

			return true;
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				return false;
			}

			throw error;
		}
	}

	async applyPurchaseItem({
		accountId,
		productKey,
		name,
		normalizedName,
		category,
		gtin,
		unit,
		merchantId,
		unitPriceCents,
		purchaseId,
		purchasedAt
	}: AccountProductRepository.ApplyPurchaseItemParams): Promise<void> {
		const now = new Date().toISOString();
		const purchasedAtISO = purchasedAt.toISOString();
		const key = {
			PK: AccountProductItem.getPK({ accountId }),
			SK: AccountProductItem.getSK({ productKey })
		};

		const applyCountersCommand = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: key,
			UpdateExpression: [
				'SET #type = :type,',
				'#accountId = :accountId,',
				'#productKey = :productKey,',
				'#normalizedName = if_not_exists(#normalizedName, :normalizedName),',
				'#gtin = if_not_exists(#gtin, :gtin),',
				'#unit = if_not_exists(#unit, :unit),',
				'#name = if_not_exists(#name, :name),',
				'#category = if_not_exists(#category, :category),',
				'#categorySource = if_not_exists(#categorySource, :categorySource),',
				'#createdAt = if_not_exists(#createdAt, :now),',
				'#lastPurchaseAt = if_not_exists(#lastPurchaseAt, :purchasedAt),',
				'#lastUnitPriceCents = if_not_exists(#lastUnitPriceCents, :unitPriceCents),',
				'#previousUnitPriceCents = if_not_exists(#previousUnitPriceCents, :null),',
				'#lastMerchantId = if_not_exists(#lastMerchantId, :merchantId),',
				'#minPriceCents = if_not_exists(#minPriceCents, :unitPriceCents),',
				'#maxPriceCents = if_not_exists(#maxPriceCents, :unitPriceCents),',
				'#lastAppliedPurchaseId = :purchaseId,',
				'#updatedAt = :now',
				'ADD #purchaseCount :one'
			].join(' '),
			ConditionExpression:
				'attribute_not_exists(SK) OR #lastAppliedPurchaseId <> :purchaseId',
			ExpressionAttributeNames: {
				'#type': 'type',
				'#accountId': 'accountId',
				'#productKey': 'productKey',
				'#name': 'name',
				'#normalizedName': 'normalizedName',
				'#category': 'category',
				'#categorySource': 'categorySource',
				'#gtin': 'gtin',
				'#unit': 'unit',
				'#createdAt': 'createdAt',
				'#lastPurchaseAt': 'lastPurchaseAt',
				'#lastUnitPriceCents': 'lastUnitPriceCents',
				'#previousUnitPriceCents': 'previousUnitPriceCents',
				'#lastMerchantId': 'lastMerchantId',
				'#minPriceCents': 'minPriceCents',
				'#maxPriceCents': 'maxPriceCents',
				'#lastAppliedPurchaseId': 'lastAppliedPurchaseId',
				'#updatedAt': 'updatedAt',
				'#purchaseCount': 'purchaseCount'
			},
			ExpressionAttributeValues: {
				':type': AccountProductItem.type,
				':accountId': accountId,
				':productKey': productKey,
				':name': name,
				':normalizedName': normalizedName,
				':category': category,
				':categorySource': AccountProduct.CategorySource.AI,
				':gtin': gtin,
				':unit': unit,
				':now': now,
				':purchasedAt': purchasedAtISO,
				':unitPriceCents': unitPriceCents,
				':merchantId': merchantId,
				':purchaseId': purchaseId,
				':null': null,
				':one': 1
			}
		});

		try {
			await dynamoClient.send(applyCountersCommand);
		} catch (error) {
			if (!(error instanceof ConditionalCheckFailedException)) {
				throw error;
			}
		}

		const advanceLatestCommand = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: key,
			UpdateExpression: [
				'SET #lastPurchaseAt = :purchasedAt,',
				'#previousUnitPriceCents = #lastUnitPriceCents,',
				'#lastUnitPriceCents = :unitPriceCents,',
				'#lastMerchantId = :merchantId,',
				'#name = :name,',
				'#normalizedName = :normalizedName,',
				'#gtin = :gtin,',
				'#unit = :unit,',
				'#updatedAt = :now'
			].join(' '),
			ConditionExpression: '#lastPurchaseAt < :purchasedAt',
			ExpressionAttributeNames: {
				'#lastPurchaseAt': 'lastPurchaseAt',
				'#previousUnitPriceCents': 'previousUnitPriceCents',
				'#lastUnitPriceCents': 'lastUnitPriceCents',
				'#lastMerchantId': 'lastMerchantId',
				'#name': 'name',
				'#normalizedName': 'normalizedName',
				'#gtin': 'gtin',
				'#unit': 'unit',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':purchasedAt': purchasedAtISO,
				':unitPriceCents': unitPriceCents,
				':merchantId': merchantId,
				':name': name,
				':normalizedName': normalizedName,
				':gtin': gtin,
				':unit': unit,
				':now': now
			}
		});

		const boundaryCommands = [
			{ attribute: 'minPriceCents', comparison: '>' },
			{ attribute: 'maxPriceCents', comparison: '<' }
		].map(
			({ attribute, comparison }) =>
				new UpdateCommand({
					TableName: this.appConfig.database.dynamodb.mainTable,
					Key: key,
					UpdateExpression:
						'SET #boundary = :unitPriceCents, #updatedAt = :now',
					ConditionExpression: `#boundary ${comparison} :unitPriceCents`,
					ExpressionAttributeNames: {
						'#boundary': attribute,
						'#updatedAt': 'updatedAt'
					},
					ExpressionAttributeValues: {
						':unitPriceCents': unitPriceCents,
						':now': now
					}
				})
		);

		await Promise.all(
			[advanceLatestCommand, ...boundaryCommands].map(async (command) => {
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

	async rebuildFromSeries({
		accountId,
		productKey,
		purchaseCount,
		minPriceCents,
		maxPriceCents,
		lastUnitPriceCents,
		previousUnitPriceCents,
		lastPurchaseAt,
		lastMerchantId,
		unit,
		lastAppliedPurchaseId
	}: AccountProductRepository.RebuildFromSeriesParams): Promise<void> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountProductItem.getPK({ accountId }),
				SK: AccountProductItem.getSK({ productKey })
			},
			UpdateExpression: [
				'SET #purchaseCount = :purchaseCount,',
				'#minPriceCents = :minPriceCents,',
				'#maxPriceCents = :maxPriceCents,',
				'#lastUnitPriceCents = :lastUnitPriceCents,',
				'#previousUnitPriceCents = :previousUnitPriceCents,',
				'#lastPurchaseAt = :lastPurchaseAt,',
				'#lastMerchantId = :lastMerchantId,',
				'#unit = :unit,',
				'#lastAppliedPurchaseId = :lastAppliedPurchaseId,',
				'#updatedAt = :now'
			].join(' '),
			ConditionExpression: 'attribute_exists(SK)',
			ExpressionAttributeNames: {
				'#purchaseCount': 'purchaseCount',
				'#minPriceCents': 'minPriceCents',
				'#maxPriceCents': 'maxPriceCents',
				'#lastUnitPriceCents': 'lastUnitPriceCents',
				'#previousUnitPriceCents': 'previousUnitPriceCents',
				'#lastPurchaseAt': 'lastPurchaseAt',
				'#lastMerchantId': 'lastMerchantId',
				'#unit': 'unit',
				'#lastAppliedPurchaseId': 'lastAppliedPurchaseId',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':purchaseCount': purchaseCount,
				':minPriceCents': minPriceCents,
				':maxPriceCents': maxPriceCents,
				':lastUnitPriceCents': lastUnitPriceCents,
				':previousUnitPriceCents': previousUnitPriceCents,
				':lastPurchaseAt': lastPurchaseAt.toISOString(),
				':lastMerchantId': lastMerchantId,
				':unit': unit,
				':lastAppliedPurchaseId': lastAppliedPurchaseId,
				':now': new Date().toISOString()
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

	async delete({
		accountId,
		productKey
	}: AccountProductRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: AccountProductItem.getPK({ accountId }),
				SK: AccountProductItem.getSK({ productKey })
			}
		});

		await dynamoClient.send(command);
	}
}

export namespace AccountProductRepository {
	export type ListByAccountParams = {
		accountId: string;
	};

	export type GetByProductKeysParams = {
		accountId: string;
		productKeys: string[];
	};

	export type UpdateCategoryParams = {
		accountId: string;
		productKey: string;
		category: Receipt.ProductCategory;
		categorySource: AccountProduct.CategorySource;
	};

	export type ApplyPurchaseItemParams = {
		accountId: string;
		productKey: string;
		name: string;
		normalizedName: string;
		category: Receipt.ProductCategory;
		gtin: string | null;
		unit: Receipt.Unit;
		merchantId: string;
		unitPriceCents: number;
		purchaseId: string;
		purchasedAt: Date;
	};

	export type RebuildFromSeriesParams = {
		accountId: string;
		productKey: string;
		purchaseCount: number;
		minPriceCents: number;
		maxPriceCents: number;
		lastUnitPriceCents: number;
		previousUnitPriceCents: number | null;
		lastPurchaseAt: Date;
		lastMerchantId: string;
		unit: Receipt.Unit;
		lastAppliedPurchaseId: string;
	};

	export type DeleteParams = {
		accountId: string;
		productKey: string;
	};
}
