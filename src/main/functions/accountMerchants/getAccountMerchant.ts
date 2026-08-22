import 'reflect-metadata';

import { GetAccountMerchantController } from '@application/controllers/accountMerchants/GetAccountMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(GetAccountMerchantController);

export const handler = lambdaHttpAdapter(controller);
