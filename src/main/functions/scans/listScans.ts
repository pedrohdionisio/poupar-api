import 'reflect-metadata';

import { ListScansController } from '@application/controllers/scans/ListScansController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ListScansController);

export const handler = lambdaHttpAdapter(controller);
