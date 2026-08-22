import 'reflect-metadata';

import { GetScanController } from '@application/controllers/scans/GetScanController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(GetScanController);

export const handler = lambdaHttpAdapter(controller);
