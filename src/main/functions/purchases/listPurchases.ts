import 'reflect-metadata';

import { ListPurchasesController } from '@application/controllers/purchases/ListPurchasesController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ListPurchasesController);

export const handler = lambdaHttpAdapter(controller);
