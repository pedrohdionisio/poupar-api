import 'reflect-metadata';

import { DeletePurchaseController } from '@application/controllers/purchases/DeletePurchaseController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(DeletePurchaseController);

export const handler = lambdaHttpAdapter(controller);
