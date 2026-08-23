import { AccountProduct } from '@application/entities/AccountProduct';
import { Receipt } from '@application/entities/Receipt';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
	DeleteCommand,
	QueryCommand,
	UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { AccountProductItem } from '../items/AccountProductItem';

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

	async applyPurchaseItem({
		accountId,
		productKey,
		name,
		normalizedName,
		gtin,
		unit,
		merchantCnpj,
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
				'#createdAt = if_not_exists(#createdAt, :now),',
				'#lastPurchaseAt = if_not_exists(#lastPurchaseAt, :purchasedAt),',
				'#lastUnitPriceCents = if_not_exists(#lastUnitPriceCents, :unitPriceCents),',
				'#previousUnitPriceCents = if_not_exists(#previousUnitPriceCents, :null),',
				'#lastMerchantCnpj = if_not_exists(#lastMerchantCnpj, :merchantCnpj),',
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
				'#gtin': 'gtin',
				'#unit': 'unit',
				'#createdAt': 'createdAt',
				'#lastPurchaseAt': 'lastPurchaseAt',
				'#lastUnitPriceCents': 'lastUnitPriceCents',
				'#previousUnitPriceCents': 'previousUnitPriceCents',
				'#lastMerchantCnpj': 'lastMerchantCnpj',
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
				':gtin': gtin,
				':unit': unit,
				':now': now,
				':purchasedAt': purchasedAtISO,
				':unitPriceCents': unitPriceCents,
				':merchantCnpj': merchantCnpj,
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
				'#lastMerchantCnpj = :merchantCnpj,',
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
				'#lastMerchantCnpj': 'lastMerchantCnpj',
				'#name': 'name',
				'#normalizedName': 'normalizedName',
				'#gtin': 'gtin',
				'#unit': 'unit',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':purchasedAt': purchasedAtISO,
				':unitPriceCents': unitPriceCents,
				':merchantCnpj': merchantCnpj,
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
		lastMerchantCnpj,
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
				'#lastMerchantCnpj = :lastMerchantCnpj,',
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
				'#lastMerchantCnpj': 'lastMerchantCnpj',
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
				':lastMerchantCnpj': lastMerchantCnpj,
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

	export type ApplyPurchaseItemParams = {
		accountId: string;
		productKey: string;
		name: string;
		normalizedName: string;
		gtin: string | null;
		unit: Receipt.Unit;
		merchantCnpj: string;
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
		lastMerchantCnpj: string;
		unit: Receipt.Unit;
		lastAppliedPurchaseId: string;
	};

	export type DeleteParams = {
		accountId: string;
		productKey: string;
	};
}
