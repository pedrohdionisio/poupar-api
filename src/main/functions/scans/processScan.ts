import 'reflect-metadata';

import { ProcessScanConsumer } from '@application/queues/scans/ProcessScanConsumer';
import { Registry } from '@kernel/di/Registry';
import { lambdaSQSAdapter } from '@main/adapters/lambdaSQSAdapter';

const consumer = Registry.getInstance().resolve(ProcessScanConsumer);

export const handler = lambdaSQSAdapter(consumer);
