import { setTimeout as delay } from 'node:timers/promises';
import { GlobalPricePoint } from '@application/entities/GlobalPricePoint';
import { BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { GlobalPricePointItem } from '../items/GlobalPricePointItem';

const BATCH_WRITE_SIZE = 25;
const BATCH_WRITE_MAX_ATTEMPTS = 5;
const BATCH_WRITE_BASE_DELAY_MS = 50;

@Injectable()
export class GlobalPricePointRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async listByProductKey({
		productKey
	}: GlobalPricePointRepository.ListByProductKeyParams): Promise<
		GlobalPricePoint[]
	> {
		const globalPricePoints: GlobalPricePointItem.ItemType[] = [];
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
					':PK': GlobalPricePointItem.getPK({
						gtin: GlobalPricePointItem.getGtin({ productKey })
					}),
					':SKPrefix': GlobalPricePointItem.getSKPrefix()
				},
				ScanIndexForward: false,
				ExclusiveStartKey: exclusiveStartKey
			});

			const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);

			globalPricePoints.push(...(Items as GlobalPricePointItem.ItemType[]));
			exclusiveStartKey = LastEvaluatedKey;
		} while (exclusiveStartKey);

		return globalPricePoints.map((globalPricePoint) =>
			GlobalPricePointItem.toEntity({ item: globalPricePoint })
		);
	}

	async createMany({
		globalPricePoints
	}: GlobalPricePointRepository.CreateManyParams): Promise<void> {
		const itemsByKey = new Map<string, GlobalPricePointItem.ItemType>();

		for (const globalPricePoint of globalPricePoints) {
			const item = GlobalPricePointItem.fromEntity({
				entity: globalPricePoint
			}).toItem();

			itemsByKey.set(`${item.PK}|${item.SK}`, item);
		}

		const items = [...itemsByKey.values()];

		for (let index = 0; index < items.length; index += BATCH_WRITE_SIZE) {
			await this.writeBatch({
				items: items.slice(index, index + BATCH_WRITE_SIZE)
			});
		}
	}

	private async writeBatch({
		items
	}: GlobalPricePointRepository.WriteBatchParams): Promise<void> {
		const tableName = this.appConfig.database.dynamodb.mainTable;
		let requests = items.map((item) => ({ PutRequest: { Item: item } }));
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
					`BatchWrite left ${requests.length} global price points unprocessed after ${attempt} attempts.`
				);
			}

			await delay(BATCH_WRITE_BASE_DELAY_MS * 2 ** (attempt - 1));
		}
	}
}

export namespace GlobalPricePointRepository {
	export type ListByProductKeyParams = {
		productKey: string;
	};

	export type CreateManyParams = {
		globalPricePoints: GlobalPricePoint[];
	};

	export type WriteBatchParams = {
		items: GlobalPricePointItem.ItemType[];
	};
}
