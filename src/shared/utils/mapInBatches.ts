export async function mapInBatches<TItem, TResult>({
	items,
	size,
	handler
}: MapInBatchesParams<TItem, TResult>): Promise<TResult[]> {
	const results: TResult[] = [];

	for (let index = 0; index < items.length; index += size) {
		const batch = items.slice(index, index + size);

		results.push(...(await Promise.all(batch.map(handler))));
	}

	return results;
}

type MapInBatchesParams<TItem, TResult> = {
	items: TItem[];
	size: number;
	handler: (item: TItem) => Promise<TResult>;
};
