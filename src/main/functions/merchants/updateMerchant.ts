import 'reflect-metadata';

import { UpdateMerchantController } from '@application/controllers/merchants/UpdateMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(UpdateMerchantController);

export const handler = lambdaHttpAdapter(controller);
