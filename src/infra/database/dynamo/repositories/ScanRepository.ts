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
	}: ScanRepository.StartProcessingParams): Promise<ScanRepository.StartProcessingResult> {
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
			},
			ReturnValues: 'UPDATED_NEW'
		});

		try {
			const { Attributes } = await dynamoClient.send(command);

			return { started: true, attempts: Number(Attributes?.attempts ?? 0) };
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				return { started: false, attempts: 0 };
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
			expectedStatus: Scan.Status.PROCESSING,
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

	async markAsDone({
		accountId,
		id,
		purchaseId
	}: ScanRepository.MarkAsDoneParams): Promise<boolean> {
		return this.finish({
			accountId,
			id,
			expectedStatus: Scan.Status.AWAITING_REVIEW,
			UpdateExpression:
				'SET #status = :status, #purchaseId = :purchaseId, #updatedAt = :updatedAt',
			ExpressionAttributeNames: {
				'#status': 'status',
				'#purchaseId': 'purchaseId',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':status': Scan.Status.DONE,
				':purchaseId': purchaseId
			}
		});
	}

	async markAsFailed({
		accountId,
		id,
		errorCode,
		purchaseId,
		ocrS3Key,
		expectedStatus = Scan.Status.PROCESSING
	}: ScanRepository.MarkAsFailedParams): Promise<boolean> {
		return this.finish({
			accountId,
			id,
			expectedStatus,
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
		expectedStatus,
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
			ConditionExpression: '#status = :expectedStatus',
			ExpressionAttributeNames,
			ExpressionAttributeValues: {
				...ExpressionAttributeValues,
				':expectedStatus': expectedStatus,
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

	export type StartProcessingResult = {
		started: boolean;
		attempts: number;
	};

	export type MarkAsAwaitingReviewParams = {
		accountId: string;
		id: string;
		draft: Scan.Draft;
		ocrS3Key: string;
	};

	export type MarkAsDoneParams = {
		accountId: string;
		id: string;
		purchaseId: string;
	};

	export type MarkAsFailedParams = {
		accountId: string;
		id: string;
		errorCode: Scan.ErrorCode;
		purchaseId: string | null;
		ocrS3Key: string | null;
		expectedStatus?: Scan.Status;
	};

	export type FinishParams = {
		accountId: string;
		id: string;
		expectedStatus: Scan.Status;
		UpdateExpression: string;
		ExpressionAttributeNames: Record<string, string>;
		ExpressionAttributeValues: Record<string, unknown>;
	};
}
