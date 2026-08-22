import 'reflect-metadata';

import { CreateMerchantController } from '@application/controllers/merchants/CreateMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreateMerchantController);

export const handler = lambdaHttpAdapter(controller);
