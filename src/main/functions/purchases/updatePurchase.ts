import 'reflect-metadata';

import { UpdatePurchaseController } from '@application/controllers/purchases/UpdatePurchaseController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(UpdatePurchaseController);

export const handler = lambdaHttpAdapter(controller);
