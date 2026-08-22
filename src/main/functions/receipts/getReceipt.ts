import 'reflect-metadata';

import { GetReceiptController } from '@application/controllers/receipts/GetReceiptController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(GetReceiptController);

export const handler = lambdaHttpAdapter(controller);
