import 'reflect-metadata';

import { ImportPurchaseController } from '@application/controllers/purchases/ImportPurchaseController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ImportPurchaseController);

export const handler = lambdaHttpAdapter(controller);
