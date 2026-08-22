import 'reflect-metadata';

import { ListPricePointsController } from '@application/controllers/pricePoints/ListPricePointsController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ListPricePointsController);

export const handler = lambdaHttpAdapter(controller);
