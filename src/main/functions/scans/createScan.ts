import 'reflect-metadata';

import { CreateScanController } from '@application/controllers/scans/CreateScanController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreateScanController);

export const handler = lambdaHttpAdapter(controller);
