import 'reflect-metadata';

import { DeleteMerchantController } from '@application/controllers/merchants/DeleteMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(DeleteMerchantController);

export const handler = lambdaHttpAdapter(controller);
