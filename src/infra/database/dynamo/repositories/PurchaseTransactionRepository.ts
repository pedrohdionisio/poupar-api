import { Purchase } from '@application/entities/Purchase';
import { PurchaseDedupe } from '@application/entities/PurchaseDedupe';
import { Receipt } from '@application/entities/Receipt';
import { ResourceAlreadyExists } from '@application/errors/application/ResourceAlreadyExists';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
	TransactWriteCommand,
	TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';
import { AccountMerchantItem } from '../items/AccountMerchantItem';
import { PurchaseDedupeItem } from '../items/PurchaseDedupeItem';
import { PurchaseItem } from '../items/PurchaseItem';
import { ReceiptItem } from '../items/ReceiptItem';

@Injectable()
export class PurchaseTransactionRepository {
	constructor(private readonly appConfig: AppConfig) {}

	async create({
		purchase,
		receipt,
		purchaseDedupe
	}: PurchaseTransactionRepository.CreateParams): Promise<void> {
		const TableName = this.appConfig.database.dynamodb.mainTable;

		const transactItems: NonNullable<
			TransactWriteCommandInput['TransactItems']
		> = [
			{
				Put: {
					TableName,
					Item: PurchaseItem.fromEntity({ entity: purchase }).toItem()
				}
			},
			{
				Put: {
					TableName,
					Item: ReceiptItem.fromEntity({ entity: receipt }).toItem()
				}
			}
		];

		if (purchaseDedupe) {
			transactItems.unshift({
				Put: {
					TableName,
					Item: PurchaseDedupeItem.fromEntity({
						entity: purchaseDedupe
					}).toItem(),
					ConditionExpression: 'attribute_not_exists(SK)'
				}
			});
		}

		const command = new TransactWriteCommand({ TransactItems: transactItems });

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (
				error instanceof TransactionCanceledException &&
				error.CancellationReasons?.some(
					(reason) => reason.Code === 'ConditionalCheckFailed'
				)
			) {
				throw new ResourceAlreadyExists('Receipt already imported.');
			}

			throw error;
		}
	}

	async deleteCascade({
		purchase,
		revertAccountMerchant
	}: PurchaseTransactionRepository.DeleteCascadeParams): Promise<void> {
		const TableName = this.appConfig.database.dynamodb.mainTable;
		const purchasedAt = purchase.purchasedAt.toISOString();

		const transactItems: NonNullable<
			TransactWriteCommandInput['TransactItems']
		> = [
			{
				Delete: {
					TableName,
					Key: {
						PK: PurchaseItem.getPK({ accountId: purchase.accountId }),
						SK: PurchaseItem.getSK({ purchasedAt, id: purchase.id })
					},
					ConditionExpression: 'attribute_exists(PK)'
				}
			},
			{
				Delete: {
					TableName,
					Key: {
						PK: ReceiptItem.getPK({ accountId: purchase.accountId }),
						SK: ReceiptItem.getSK({ purchaseId: purchase.id })
					}
				}
			}
		];

		if (purchase.accessKey) {
			transactItems.push({
				Delete: {
					TableName,
					Key: {
						PK: PurchaseDedupeItem.getPK({ accountId: purchase.accountId }),
						SK: PurchaseDedupeItem.getSK({ accessKey: purchase.accessKey })
					},
					ConditionExpression:
						'attribute_not_exists(SK) OR #purchaseId = :purchaseId',
					ExpressionAttributeNames: { '#purchaseId': 'purchaseId' },
					ExpressionAttributeValues: { ':purchaseId': purchase.id }
				}
			});
		}

		if (revertAccountMerchant) {
			transactItems.push({
				Update: {
					TableName,
					Key: {
						PK: AccountMerchantItem.getPK({ accountId: purchase.accountId }),
						SK: AccountMerchantItem.getSK({ cnpj: purchase.merchantCnpj })
					},
					UpdateExpression:
						'SET #updatedAt = :now ADD #purchaseCount :minusOne, #totalSpentCents :minusTotal',
					ConditionExpression: 'attribute_exists(SK)',
					ExpressionAttributeNames: {
						'#updatedAt': 'updatedAt',
						'#purchaseCount': 'purchaseCount',
						'#totalSpentCents': 'totalSpentCents'
					},
					ExpressionAttributeValues: {
						':now': new Date().toISOString(),
						':minusOne': -1,
						':minusTotal': -purchase.totalCents
					}
				}
			});
		}

		const command = new TransactWriteCommand({ TransactItems: transactItems });

		try {
			await dynamoClient.send(command);
		} catch (error) {
			if (
				error instanceof TransactionCanceledException &&
				error.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed'
			) {
				throw new ResourceNotFound('Purchase not found.');
			}

			throw error;
		}
	}
}

export namespace PurchaseTransactionRepository {
	export type CreateParams = {
		purchase: Purchase;
		receipt: Receipt;
		purchaseDedupe: PurchaseDedupe | null;
	};

	export type DeleteCascadeParams = {
		purchase: Purchase;
		revertAccountMerchant: boolean;
	};
}
