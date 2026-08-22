import 'reflect-metadata';

import { CreateReceiptController } from '@application/controllers/receipts/CreateReceiptController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreateReceiptController);

export const handler = lambdaHttpAdapter(controller);
