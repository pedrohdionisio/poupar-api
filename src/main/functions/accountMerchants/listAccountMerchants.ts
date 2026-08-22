import 'reflect-metadata';

import { ListAccountMerchantsController } from '@application/controllers/accountMerchants/ListAccountMerchantsController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(
	ListAccountMerchantsController
);

export const handler = lambdaHttpAdapter(controller);
