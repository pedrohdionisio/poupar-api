/** biome-ignore-all lint/suspicious/noConsole: <> */
import { Injectable } from '@kernel/decorators/Injectable';

type CompensationFnType = () => Promise<void>;

@Injectable()
export class Saga {
	private compensations: CompensationFnType[] = [];

	addCompensations(fn: CompensationFnType) {
		this.compensations.unshift(fn);
	}

	async run<TResult>(fn: () => Promise<TResult>) {
		this.compensations = [];

		try {
			return await fn();
		} catch (error) {
			await this.compensate();

			throw error;
		}
	}

	async compensate() {
		const compensations = this.compensations;

		this.compensations = [];

		for (const compensation of compensations) {
			try {
				await compensation();
			} catch (error) {
				console.error(error);
			}
		}
	}
}
