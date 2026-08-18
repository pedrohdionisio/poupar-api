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
		try {
			return await fn();
		} catch (error) {
			await this.compensate();

			throw error;
		}
	}

	async compensate() {
		for await (const compensation of this.compensations) {
			try {
				await compensation();
			} catch (error) {
				console.log(error);
			}
		}
	}
}
