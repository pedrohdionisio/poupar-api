import 'reflect-metadata';

import { ListAccountProductsController } from '@application/controllers/accountProducts/ListAccountProductsController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(
	ListAccountProductsController
);

export const handler = lambdaHttpAdapter(controller);
