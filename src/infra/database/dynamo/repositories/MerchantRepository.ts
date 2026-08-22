import { Merchant } from '@application/entities/Merchant';
import { ResourceAlreadyExists } from '@application/errors/application/ResourceAlreadyExists';
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
import { MerchantItem } from '../items/MerchantItem';

@Injectable()
export class MerchantRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async getByCnpj({ cnpj }: MerchantRepository.GetByCnpjParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ cnpj }),
				SK: MerchantItem.getSK({ cnpj })
			}
		});

		const { Item: merchantItem } = await dynamoClient.send(command);

		if (!merchantItem) {
			return null;
		}

		return MerchantItem.toEntity({
			item: { ...(merchantItem as MerchantItem.ItemType) }
		});
	}

	private getPutCommandInput({
		merchant
	}: MerchantRepository.GetPutCommandInputParams): PutCommandInput {
		const merchantItem = MerchantItem.fromEntity({ entity: merchant });

		return {
			TableName: this.appConfig.database.dynamodb.mainTable,
			Item: merchantItem.toItem()
		};
	}

	async create({ merchant }: MerchantRepository.CreateParams): Promise<void> {
		const command = new PutCommand({
			...this.getPutCommandInput({ merchant }),
			ConditionExpression: 'attribute_not_exists(PK)'
		});

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new ResourceAlreadyExists('Merchant already exists.');
			}

			throw error;
		}
	}

	async update({ merchant }: MerchantRepository.UpdateParams): Promise<void> {
		const { name, fantasyName, category, address, updatedAt } =
			MerchantItem.fromEntity({ entity: merchant }).toItem();

		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ cnpj: merchant.cnpj }),
				SK: MerchantItem.getSK({ cnpj: merchant.cnpj })
			},
			UpdateExpression:
				'SET #name = :name, #fantasyName = :fantasyName, #category = :category, #address = :address, #updatedAt = :updatedAt',
			ExpressionAttributeNames: {
				'#name': 'name',
				'#fantasyName': 'fantasyName',
				'#category': 'category',
				'#address': 'address',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':name': name,
				':fantasyName': fantasyName,
				':category': category,
				':address': address,
				':updatedAt': updatedAt
			}
		});

		await dynamoClient.send(command);
	}

	async delete({ cnpj }: MerchantRepository.DeleteParams): Promise<void> {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ cnpj }),
				SK: MerchantItem.getSK({ cnpj })
			}
		});

		await dynamoClient.send(command);
	}

	async list(): Promise<Merchant[]> {
		const command = new QueryCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			IndexName: 'GSI1',
			KeyConditionExpression: '#GSI1PK = :GSI1PK',
			ExpressionAttributeNames: {
				'#GSI1PK': 'GSI1PK'
			},
			ExpressionAttributeValues: {
				':GSI1PK': MerchantItem.getGSI1PK()
			}
		});

		const { Items = [] } = await dynamoClient.send(command);
		const merchants = Items as MerchantItem.ItemType[];

		return merchants.map((merchant) =>
			MerchantItem.toEntity({ item: merchant })
		);
	}
}

export namespace MerchantRepository {
	export type GetByCnpjParams = {
		cnpj: string;
	};

	export type GetPutCommandInputParams = {
		merchant: Merchant;
	};

	export type CreateParams = {
		merchant: Merchant;
	};

	export type UpdateParams = {
		merchant: Merchant;
	};

	export type DeleteParams = {
		cnpj: string;
	};
}
