import 'reflect-metadata';

import { CreatePurchaseController } from '@application/controllers/purchases/CreatePurchaseController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreatePurchaseController);

export const handler = lambdaHttpAdapter(controller);
