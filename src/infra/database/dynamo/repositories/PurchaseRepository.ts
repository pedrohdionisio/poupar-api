import { Purchase } from '@application/entities/Purchase';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
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
import { PurchaseItem } from '../items/PurchaseItem';

@Injectable()
export class PurchaseRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getById({
		accountId,
		purchasedAt,
		id
	}: PurchaseRepository.GetByIdParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: PurchaseItem.getPK({ accountId }),
				SK: PurchaseItem.getSK({ purchasedAt, id })
			}
		});

		const { Item: purchaseItem } = await dynamoClient.send(command);

		if (!purchaseItem) {
			return null;
		}

		return PurchaseItem.toEntity({
			item: { ...(purchaseItem as PurchaseItem.ItemType) }
		});
	}

	async listLatest({
		accountId,
		limit
	}: PurchaseRepository.ListLatestParams): Promise<Purchase[]> {
		const command = new QueryCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SKPrefix)',
			ExpressionAttributeNames: {
				'#PK': 'PK',
				'#SK': 'SK'
			},
			ExpressionAttributeValues: {
				':PK': PurchaseItem.getPK({ accountId }),
				':SKPrefix': PurchaseItem.getSKPrefix()
			},
			ScanIndexForward: false,
			Limit: limit
		});

		const { Items = [] } = await dynamoClient.send(command);
		const purchases = Items as PurchaseItem.ItemType[];

		return purchases.map((purchase) =>
			PurchaseItem.toEntity({ item: purchase })
		);
	}

	async listByPeriod({
		accountId,
		from,
		to,
		limit
	}: PurchaseRepository.ListByPeriodParams): Promise<Purchase[]> {
		const purchases: PurchaseItem.ItemType[] = [];
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
					':PK': PurchaseItem.getPK({ accountId }),
					':from': PurchaseItem.getSKFrom({ from }),
					':to': PurchaseItem.getSKTo({ to })
				},
				ScanIndexForward: false,
				ExclusiveStartKey: exclusiveStartKey,
				Limit: limit
			});

			const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);

			purchases.push(...(Items as PurchaseItem.ItemType[]));
			exclusiveStartKey = LastEvaluatedKey;
		} while (exclusiveStartKey && (!limit || purchases.length < limit));

		const page = limit ? purchases.slice(0, limit) : purchases;

		return page.map((purchase) => PurchaseItem.toEntity({ item: purchase }));
	}

	private getPutCommandInput({
		purchase
	}: PurchaseRepository.GetPutCommandInputParams): PutCommandInput {
		const purchaseItem = PurchaseItem.fromEntity({ entity: purchase });

		return {
			TableName: this.appConfig.database.dynamodb.mainTable,
			Item: purchaseItem.toItem()
		};
	}

	async create({ purchase }: PurchaseRepository.CreateParams): Promise<void> {
		await dynamoClient.send(
			new PutCommand(this.getPutCommandInput({ purchase }))
		);
	}

	async update({ purchase }: PurchaseRepository.UpdateParams): Promise<void> {
		const {
			merchantId,
			merchantName,
			category,
			totalCents,
			discountCents,
			itemCount,
			updatedAt
		} = PurchaseItem.fromEntity({ entity: purchase }).toItem();

		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: PurchaseItem.getPK({ accountId: purchase.accountId }),
				SK: PurchaseItem.getSK({
					purchasedAt: purchase.purchasedAt.toISOString(),
					id: purchase.id
				})
			},
			UpdateExpression:
				'SET #merchantId = :merchantId, #merchantName = :merchantName, #category = :category, #totalCents = :totalCents, #discountCents = :discountCents, #itemCount = :itemCount, #updatedAt = :updatedAt',
			ConditionExpression: 'attribute_exists(PK)',
			ExpressionAttributeNames: {
				'#merchantId': 'merchantId',
				'#merchantName': 'merchantName',
				'#category': 'category',
				'#totalCents': 'totalCents',
				'#discountCents': 'discountCents',
				'#itemCount': 'itemCount',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':merchantId': merchantId,
				':merchantName': merchantName,
				':category': category,
				':totalCents': totalCents,
				':discountCents': discountCents,
				':itemCount': itemCount,
				':updatedAt': updatedAt
			}
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new ResourceNotFound('Purchase not found.');
			}

			throw error;
		}
	}

	async delete({
		accountId,
		purchasedAt,
		id
	}: PurchaseRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: PurchaseItem.getPK({ accountId }),
				SK: PurchaseItem.getSK({ purchasedAt, id })
			}
		});

		await dynamoClient.send(command);
	}
}

export namespace PurchaseRepository {
	export type GetByIdParams = {
		accountId: string;
		purchasedAt: string;
		id: string;
	};

	export type ListLatestParams = {
		accountId: string;
		limit: number;
	};

	export type ListByPeriodParams = {
		accountId: string;
		from: string;
		to: string;
		limit: number | undefined;
	};

	export type GetPutCommandInputParams = {
		purchase: Purchase;
	};

	export type CreateParams = {
		purchase: Purchase;
	};

	export type UpdateParams = {
		purchase: Purchase;
	};

	export type DeleteParams = {
		accountId: string;
		purchasedAt: string;
		id: string;
	};
}
