import 'reflect-metadata';

import { ConfirmScanController } from '@application/controllers/scans/ConfirmScanController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ConfirmScanController);

export const handler = lambdaHttpAdapter(controller);
