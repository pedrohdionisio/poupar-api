import 'reflect-metadata';

import { DeleteAccountController } from '@application/controllers/accounts/DeleteAccountController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(DeleteAccountController);

export const handler = lambdaHttpAdapter(controller);
