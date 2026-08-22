import { Receipt } from '@application/entities/Receipt';
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
import { ReceiptItem } from '../items/ReceiptItem';

@Injectable()
export class ReceiptRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getByPurchaseId({
		accountId,
		purchaseId
	}: ReceiptRepository.GetByPurchaseIdParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: ReceiptItem.getPK({ accountId }),
				SK: ReceiptItem.getSK({ purchaseId })
			}
		});

		const { Item: receiptItem } = await dynamoClient.send(command);

		if (!receiptItem) {
			return null;
		}

		return ReceiptItem.toEntity({
			item: { ...(receiptItem as ReceiptItem.ItemType) }
		});
	}

	private getPutCommandInput({
		receipt
	}: ReceiptRepository.GetPutCommandInputParams): PutCommandInput {
		const receiptItem = ReceiptItem.fromEntity({ entity: receipt });

		return {
			TableName: this.appConfig.database.dynamodb.mainTable,
			Item: receiptItem.toItem()
		};
	}

	async create({ receipt }: ReceiptRepository.CreateParams): Promise<void> {
		const command = new PutCommand({
			...this.getPutCommandInput({ receipt }),
			ConditionExpression: 'attribute_not_exists(SK)'
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new ResourceAlreadyExists('Receipt already exists.');
			}

			throw error;
		}
	}

	async delete({
		accountId,
		purchaseId
	}: ReceiptRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: ReceiptItem.getPK({ accountId }),
				SK: ReceiptItem.getSK({ purchaseId })
			}
		});

		await dynamoClient.send(command);
	}
}

export namespace ReceiptRepository {
	export type GetByPurchaseIdParams = {
		accountId: string;
		purchaseId: string;
	};

	export type GetPutCommandInputParams = {
		receipt: Receipt;
	};

	export type CreateParams = {
		receipt: Receipt;
	};

	export type DeleteParams = {
		accountId: string;
		purchaseId: string;
	};
}
