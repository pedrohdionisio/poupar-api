import 'reflect-metadata';

import { ListCategorySpendsController } from '@application/controllers/categorySpends/ListCategorySpendsController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ListCategorySpendsController);

export const handler = lambdaHttpAdapter(controller);
