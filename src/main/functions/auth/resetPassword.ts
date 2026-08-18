import 'reflect-metadata';
import { ResetPasswordController } from '@application/controllers/auth/ResetPasswordController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(ResetPasswordController);

export const handler = lambdaHttpAdapter(controller);
