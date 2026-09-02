import type { Constructor } from '@shared/types/Constructor';
import { type Mocked, vi } from 'vitest';

export function createMock<TTarget extends object>(
	target: Constructor<TTarget>,
	overrides: Partial<TTarget> = {}
): Mocked<TTarget> {
	const mock: Record<string, unknown> = {};

	for (const method of Object.getOwnPropertyNames(target.prototype)) {
		if (method === 'constructor') {
			continue;
		}

		const override = overrides[method as keyof TTarget];

		mock[method] = override ? vi.fn(override as never) : vi.fn();
	}

	return mock as Mocked<TTarget>;
}
