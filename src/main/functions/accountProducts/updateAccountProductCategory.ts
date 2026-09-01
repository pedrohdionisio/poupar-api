import 'reflect-metadata';

import { UpdateAccountProductCategoryController } from '@application/controllers/accountProducts/UpdateAccountProductCategoryController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(
	UpdateAccountProductCategoryController
);

export const handler = lambdaHttpAdapter(controller);
