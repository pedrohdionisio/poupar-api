import { Scan } from '@application/entities/Scan';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
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

	async update({ scan }: ScanRepository.UpdateParams): Promise<void> {
		const { status, provider, purchaseId, errorCode, attempts, updatedAt } =
			ScanItem.fromEntity({ entity: scan }).toItem();

		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: ScanItem.getPK({ accountId: scan.accountId }),
				SK: ScanItem.getSK({ id: scan.id })
			},
			UpdateExpression:
				'SET #status = :status, #provider = :provider, #purchaseId = :purchaseId, #errorCode = :errorCode, #attempts = :attempts, #updatedAt = :updatedAt',
			ConditionExpression: 'attribute_exists(PK)',
			ExpressionAttributeNames: {
				'#status': 'status',
				'#provider': 'provider',
				'#purchaseId': 'purchaseId',
				'#errorCode': 'errorCode',
				'#attempts': 'attempts',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':status': status,
				':provider': provider,
				':purchaseId': purchaseId,
				':errorCode': errorCode,
				':attempts': attempts,
				':updatedAt': updatedAt
			}
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new ResourceNotFound('Scan not found.');
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

	export type UpdateParams = {
		scan: Scan;
	};
}
