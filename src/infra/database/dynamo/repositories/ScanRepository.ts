import { Scan } from '@application/entities/Scan';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
	GetCommand,
	PutCommand,
	PutCommandInput,
	UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { ScanItem } from '../items/ScanItem';

@Injectable()
export class ScanRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getById({ accountId, id }: ScanRepository.GetByIdParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: ScanItem.getPK({ accountId }),
				SK: ScanItem.getSK({ id })
			}
		});

		const { Item: scanItem } = await dynamoClient.send(command);

		if (!scanItem) {
			return null;
		}

		return ScanItem.toEntity({
			item: { ...(scanItem as ScanItem.ItemType) }
		});
	}

	private getPutCommandInput({
		scan
	}: ScanRepository.GetPutCommandInputParams): PutCommandInput {
		const scanItem = ScanItem.fromEntity({ entity: scan });

		return {
			TableName: this.appConfig.database.dynamodb.mainTable,
			Item: scanItem.toItem()
		};
	}

	async create({ scan }: ScanRepository.CreateParams): Promise<void> {
		await dynamoClient.send(new PutCommand(this.getPutCommandInput({ scan })));
	}

	async startProcessing({
		accountId,
		id
	}: ScanRepository.StartProcessingParams): Promise<boolean> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: ScanItem.getPK({ accountId }),
				SK: ScanItem.getSK({ id })
			},
			UpdateExpression:
				'SET #status = :processing, #updatedAt = :updatedAt ADD #attempts :increment',
			ConditionExpression:
				'attribute_exists(PK) AND #status IN (:pending, :processing)',
			ExpressionAttributeNames: {
				'#status': 'status',
				'#attempts': 'attempts',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':pending': Scan.Status.PENDING,
				':processing': Scan.Status.PROCESSING,
				':increment': 1,
				':updatedAt': new Date().toISOString()
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

	async markAsAwaitingReview({
		accountId,
		id,
		draft,
		ocrS3Key
	}: ScanRepository.MarkAsAwaitingReviewParams): Promise<boolean> {
		return this.finish({
			accountId,
			id,
			UpdateExpression:
				'SET #status = :status, #draft = :draft, #ocrS3Key = :ocrS3Key, #updatedAt = :updatedAt',
			ExpressionAttributeNames: {
				'#status': 'status',
				'#draft': 'draft',
				'#ocrS3Key': 'ocrS3Key',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':status': Scan.Status.AWAITING_REVIEW,
				':draft': draft,
				':ocrS3Key': ocrS3Key
			}
		});
	}

	async markAsFailed({
		accountId,
		id,
		errorCode,
		purchaseId,
		ocrS3Key
	}: ScanRepository.MarkAsFailedParams): Promise<boolean> {
		return this.finish({
			accountId,
			id,
			UpdateExpression:
				'SET #status = :status, #errorCode = :errorCode, #purchaseId = :purchaseId, #ocrS3Key = :ocrS3Key, #updatedAt = :updatedAt',
			ExpressionAttributeNames: {
				'#status': 'status',
				'#errorCode': 'errorCode',
				'#purchaseId': 'purchaseId',
				'#ocrS3Key': 'ocrS3Key',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':status': Scan.Status.FAILED,
				':errorCode': errorCode,
				':purchaseId': purchaseId,
				':ocrS3Key': ocrS3Key
			}
		});
	}

	private async finish({
		accountId,
		id,
		UpdateExpression,
		ExpressionAttributeNames,
		ExpressionAttributeValues
	}: ScanRepository.FinishParams): Promise<boolean> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: ScanItem.getPK({ accountId }),
				SK: ScanItem.getSK({ id })
			},
			UpdateExpression,
			ConditionExpression: '#status = :processing',
			ExpressionAttributeNames,
			ExpressionAttributeValues: {
				...ExpressionAttributeValues,
				':processing': Scan.Status.PROCESSING,
				':updatedAt': new Date().toISOString()
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
}

export namespace ScanRepository {
	export type GetByIdParams = {
		accountId: string;
		id: string;
	};

	export type GetPutCommandInputParams = {
		scan: Scan;
	};

	export type CreateParams = {
		scan: Scan;
	};

	export type StartProcessingParams = {
		accountId: string;
		id: string;
	};

	export type MarkAsAwaitingReviewParams = {
		accountId: string;
		id: string;
		draft: Scan.Draft;
		ocrS3Key: string;
	};

	export type MarkAsFailedParams = {
		accountId: string;
		id: string;
		errorCode: Scan.ErrorCode;
		purchaseId: string | null;
		ocrS3Key: string | null;
	};

	export type FinishParams = {
		accountId: string;
		id: string;
		UpdateExpression: string;
		ExpressionAttributeNames: Record<string, string>;
		ExpressionAttributeValues: Record<string, unknown>;
	};
}
