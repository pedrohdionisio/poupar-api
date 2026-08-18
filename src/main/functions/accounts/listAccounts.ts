import 'reflect-metadata';

import { ListAccountsController } from '@application/controllers/accounts/ListAccountsController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ListAccountsController);

export const handler = lambdaHttpAdapter(controller);
