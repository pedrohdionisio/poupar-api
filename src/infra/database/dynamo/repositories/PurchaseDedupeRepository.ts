import { PurchaseDedupe } from '@application/entities/PurchaseDedupe';
import { ResourceAlreadyExists } from '@application/errors/application/ResourceAlreadyExists';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	PutCommandInput
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { PurchaseDedupeItem } from '../items/PurchaseDedupeItem';

@Injectable()
export class PurchaseDedupeRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getByAccessKey({
		accountId,
		accessKey
	}: PurchaseDedupeRepository.GetByAccessKeyParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: PurchaseDedupeItem.getPK({ accountId }),
				SK: PurchaseDedupeItem.getSK({ accessKey })
			}
		});

		const { Item: purchaseDedupeItem } = await dynamoClient.send(command);

		if (!purchaseDedupeItem) {
			return null;
		}

		return PurchaseDedupeItem.toEntity({
			item: { ...(purchaseDedupeItem as PurchaseDedupeItem.ItemType) }
		});
	}

	private getPutCommandInput({
		purchaseDedupe
	}: PurchaseDedupeRepository.GetPutCommandInputParams): PutCommandInput {
		const purchaseDedupeItem = PurchaseDedupeItem.fromEntity({
			entity: purchaseDedupe
		});

		return {
			TableName: this.appConfig.database.dynamodb.mainTable,
			Item: purchaseDedupeItem.toItem()
		};
	}

	async create({
		purchaseDedupe
	}: PurchaseDedupeRepository.CreateParams): Promise<void> {
		const command = new PutCommand({
			...this.getPutCommandInput({ purchaseDedupe }),
			ConditionExpression: 'attribute_not_exists(SK)'
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new ResourceAlreadyExists('Purchase already imported.');
			}

			throw error;
		}
	}

	async delete({
		accountId,
		accessKey,
		purchaseId
	}: PurchaseDedupeRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: PurchaseDedupeItem.getPK({ accountId }),
				SK: PurchaseDedupeItem.getSK({ accessKey })
			},
			ConditionExpression: '#purchaseId = :purchaseId',
			ExpressionAttributeNames: {
				'#purchaseId': 'purchaseId'
			},
			ExpressionAttributeValues: {
				':purchaseId': purchaseId
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
}

export namespace PurchaseDedupeRepository {
	export type GetByAccessKeyParams = {
		accountId: string;
		accessKey: string;
	};

	export type GetPutCommandInputParams = {
		purchaseDedupe: PurchaseDedupe;
	};

	export type CreateParams = {
		purchaseDedupe: PurchaseDedupe;
	};

	export type DeleteParams = {
		accountId: string;
		accessKey: string;
		purchaseId: string;
	};
}
