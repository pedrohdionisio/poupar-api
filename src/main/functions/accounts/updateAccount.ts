import 'reflect-metadata';

import { UpdateAccountController } from '@application/controllers/accounts/UpdateAccountController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(UpdateAccountController);

export const handler = lambdaHttpAdapter(controller);
