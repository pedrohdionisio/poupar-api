import { setTimeout as delay } from 'node:timers/promises';
import { PricePoint } from '@application/entities/PricePoint';
import { BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { PricePointItem } from '../items/PricePointItem';

const BATCH_WRITE_SIZE = 25;
const BATCH_WRITE_MAX_ATTEMPTS = 5;
const BATCH_WRITE_BASE_DELAY_MS = 50;

@Injectable()
export class PricePointRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async listByProduct({
		accountId,
		productKey
	}: PricePointRepository.ListByProductParams): Promise<PricePoint[]> {
		const pricePoints: PricePointItem.ItemType[] = [];
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
					':PK': PricePointItem.getPK({ accountId, productKey }),
					':SKPrefix': PricePointItem.getSKPrefix()
				},
				ScanIndexForward: true,
				ExclusiveStartKey: exclusiveStartKey
			});

			const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);

			pricePoints.push(...(Items as PricePointItem.ItemType[]));
			exclusiveStartKey = LastEvaluatedKey;
		} while (exclusiveStartKey);

		return pricePoints.map((pricePoint) =>
			PricePointItem.toEntity({ item: pricePoint })
		);
	}

	async createMany({
		pricePoints
	}: PricePointRepository.CreateManyParams): Promise<void> {
		const itemsByKey = new Map<string, PricePointItem.ItemType>();

		for (const pricePoint of pricePoints) {
			const item = PricePointItem.fromEntity({ entity: pricePoint }).toItem();

			itemsByKey.set(`${item.PK}|${item.SK}`, item);
		}

		const requests = [...itemsByKey.values()].map((item) => ({
			PutRequest: { Item: item }
		}));

		await this.writeInBatches({ requests });
	}

	async deleteMany({
		accountId,
		productKeys,
		purchasedAt,
		purchaseId
	}: PricePointRepository.DeleteManyParams): Promise<void> {
		const keysByKey = new Map<string, PricePointRepository.Key>();

		for (const productKey of productKeys) {
			const key = {
				PK: PricePointItem.getPK({ accountId, productKey }),
				SK: PricePointItem.getSK({
					purchasedAt: purchasedAt.toISOString(),
					purchaseId
				})
			};

			keysByKey.set(`${key.PK}|${key.SK}`, key);
		}

		const requests = [...keysByKey.values()].map((key) => ({
			DeleteRequest: { Key: key }
		}));

		await this.writeInBatches({ requests });
	}

	private async writeInBatches({
		requests
	}: PricePointRepository.WriteInBatchesParams): Promise<void> {
		for (let index = 0; index < requests.length; index += BATCH_WRITE_SIZE) {
			await this.writeBatch({
				requests: requests.slice(index, index + BATCH_WRITE_SIZE)
			});
		}
	}

	private async writeBatch({
		requests: batch
	}: PricePointRepository.WriteBatchParams): Promise<void> {
		const tableName = this.appConfig.database.dynamodb.mainTable;
		let requests = batch;
		let attempt = 0;

		while (requests.length > 0) {
			const command = new BatchWriteCommand({
				RequestItems: { [tableName]: requests }
			});

			const { UnprocessedItems = {} } = await dynamoClient.send(command);

			requests = (UnprocessedItems[tableName] ?? []) as typeof requests;

			if (requests.length === 0) {
				return;
			}

			attempt += 1;

			if (attempt >= BATCH_WRITE_MAX_ATTEMPTS) {
				throw new Error(
					`BatchWrite left ${requests.length} price points unprocessed after ${attempt} attempts.`
				);
			}

			await delay(BATCH_WRITE_BASE_DELAY_MS * 2 ** (attempt - 1));
		}
	}
}

export namespace PricePointRepository {
	export type ListByProductParams = {
		accountId: string;
		productKey: string;
	};

	export type CreateManyParams = {
		pricePoints: PricePoint[];
	};

	export type DeleteManyParams = {
		accountId: string;
		productKeys: string[];
		purchasedAt: Date;
		purchaseId: string;
	};

	export type Key = {
		PK: PricePointItem.Keys['PK'];
		SK: PricePointItem.Keys['SK'];
	};

	export type WriteRequest =
		| { PutRequest: { Item: PricePointItem.ItemType } }
		| { DeleteRequest: { Key: PricePointRepository.Key } };

	export type WriteInBatchesParams = {
		requests: PricePointRepository.WriteRequest[];
	};

	export type WriteBatchParams = {
		requests: PricePointRepository.WriteRequest[];
	};
}
