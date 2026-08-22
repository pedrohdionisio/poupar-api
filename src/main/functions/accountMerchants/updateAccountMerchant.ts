import 'reflect-metadata';

import { UpdateAccountMerchantController } from '@application/controllers/accountMerchants/UpdateAccountMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(
	UpdateAccountMerchantController
);

export const handler = lambdaHttpAdapter(controller);
