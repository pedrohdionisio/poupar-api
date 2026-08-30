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

	async getById({ accountId, id }: MerchantRepository.GetByIdParams) {
		const command = new GetCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ accountId }),
				SK: MerchantItem.getSK({ id })
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

	async listByAccount({
		accountId
	}: MerchantRepository.ListByAccountParams): Promise<Merchant[]> {
		const command = new QueryCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :SKPrefix)',
			ExpressionAttributeNames: {
				'#PK': 'PK',
				'#SK': 'SK'
			},
			ExpressionAttributeValues: {
				':PK': MerchantItem.getPK({ accountId }),
				':SKPrefix': MerchantItem.getSKPrefix()
			}
		});

		const { Items = [] } = await dynamoClient.send(command);
		const merchants = Items as MerchantItem.ItemType[];

		return merchants.map((merchant) =>
			MerchantItem.toEntity({ item: merchant })
		);
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
			ConditionExpression: 'attribute_not_exists(SK)'
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
		const { name, category, cnpj, updatedAt } = MerchantItem.fromEntity({
			entity: merchant
		}).toItem();

		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ accountId: merchant.accountId }),
				SK: MerchantItem.getSK({ id: merchant.id })
			},
			UpdateExpression:
				'SET #name = :name, #category = :category, #cnpj = :cnpj, #updatedAt = :updatedAt',
			ExpressionAttributeNames: {
				'#name': 'name',
				'#category': 'category',
				'#cnpj': 'cnpj',
				'#updatedAt': 'updatedAt'
			},
			ExpressionAttributeValues: {
				':name': name,
				':category': category,
				':cnpj': cnpj,
				':updatedAt': updatedAt
			}
		});

		await dynamoClient.send(command);
	}

	async delete({ accountId, id }: MerchantRepository.DeleteParams) {
		const command = new DeleteCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ accountId }),
				SK: MerchantItem.getSK({ id })
			}
		});

		await dynamoClient.send(command);
	}

	async applyPurchase({
		accountId,
		merchantId,
		purchaseId,
		totalCents,
		purchasedAt
	}: MerchantRepository.ApplyPurchaseParams): Promise<void> {
		const now = new Date().toISOString();
		const purchasedAtISO = purchasedAt.toISOString();
		const key = {
			PK: MerchantItem.getPK({ accountId }),
			SK: MerchantItem.getSK({ id: merchantId })
		};

		const applyCountersCommand = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: key,
			UpdateExpression: [
				'SET #lastAppliedPurchaseId = :purchaseId,',
				'#updatedAt = :now',
				'ADD #purchaseCount :one, #totalSpentCents :totalCents'
			].join(' '),
			ConditionExpression:
				'attribute_exists(SK) AND #lastAppliedPurchaseId <> :purchaseId',
			ExpressionAttributeNames: {
				'#lastAppliedPurchaseId': 'lastAppliedPurchaseId',
				'#updatedAt': 'updatedAt',
				'#purchaseCount': 'purchaseCount',
				'#totalSpentCents': 'totalSpentCents'
			},
			ExpressionAttributeValues: {
				':now': now,
				':purchaseId': purchaseId,
				':one': 1,
				':totalCents': totalCents
			}
		});

		try {
			await dynamoClient.send(applyCountersCommand);
		} catch (error) {
			if (error instanceof ConditionalCheckFailedException) {
				return;
			}

			throw error;
		}

		const boundaryCommands = [
			{ attribute: 'firstPurchaseAt', comparison: '>' },
			{ attribute: 'lastPurchaseAt', comparison: '<' }
		].map(
			({ attribute, comparison }) =>
				new UpdateCommand({
					TableName: this.appConfig.database.dynamodb.mainTable,
					Key: key,
					UpdateExpression: 'SET #boundary = :purchasedAt, #updatedAt = :now',
					ConditionExpression: [
						'attribute_not_exists(#boundary)',
						'OR attribute_type(#boundary, :nullType)',
						`OR #boundary ${comparison} :purchasedAt`
					].join(' '),
					ExpressionAttributeNames: {
						'#boundary': attribute,
						'#updatedAt': 'updatedAt'
					},
					ExpressionAttributeValues: {
						':purchasedAt': purchasedAtISO,
						':nullType': 'NULL',
						':now': now
					}
				})
		);

		await Promise.all(
			boundaryCommands.map(async (command) => {
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

	async adjustTotals({
		accountId,
		merchantId,
		purchaseCountDelta,
		totalCentsDelta
	}: MerchantRepository.AdjustTotalsParams): Promise<void> {
		const command = new UpdateCommand({
			TableName: this.appConfig.database.dynamodb.mainTable,
			Key: {
				PK: MerchantItem.getPK({ accountId }),
				SK: MerchantItem.getSK({ id: merchantId })
			},
			UpdateExpression:
				'SET #updatedAt = :now ADD #purchaseCount :purchaseCountDelta, #totalSpentCents :totalCentsDelta',
			ConditionExpression: 'attribute_exists(SK)',
			ExpressionAttributeNames: {
				'#updatedAt': 'updatedAt',
				'#purchaseCount': 'purchaseCount',
				'#totalSpentCents': 'totalSpentCents'
			},
			ExpressionAttributeValues: {
				':now': new Date().toISOString(),
				':purchaseCountDelta': purchaseCountDelta,
				':totalCentsDelta': totalCentsDelta
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

export namespace MerchantRepository {
	export type GetByIdParams = {
		accountId: string;
		id: string;
	};

	export type ListByAccountParams = {
		accountId: string;
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
		accountId: string;
		id: string;
	};

	export type ApplyPurchaseParams = {
		accountId: string;
		merchantId: string;
		purchaseId: string;
		totalCents: number;
		purchasedAt: Date;
	};

	export type AdjustTotalsParams = {
		accountId: string;
		merchantId: string;
		purchaseCountDelta: number;
		totalCentsDelta: number;
	};
}
