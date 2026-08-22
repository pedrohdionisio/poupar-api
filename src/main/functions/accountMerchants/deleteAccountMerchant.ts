import 'reflect-metadata';

import { DeleteAccountMerchantController } from '@application/controllers/accountMerchants/DeleteAccountMerchantController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(
	DeleteAccountMerchantController
);

export const handler = lambdaHttpAdapter(controller);
