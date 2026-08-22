import 'reflect-metadata';

import { ListMerchantsController } from '@application/controllers/merchants/ListMerchantsController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ListMerchantsController);

export const handler = lambdaHttpAdapter(controller);
