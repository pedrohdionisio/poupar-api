import 'reflect-metadata';

import { GetMerchantController } from '@application/controllers/merchants/GetMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(GetMerchantController);

export const handler = lambdaHttpAdapter(controller);
