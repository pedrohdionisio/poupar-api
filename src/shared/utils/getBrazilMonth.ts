const BRAZIL_OFFSET_IN_MINUTES = 180;

export function getBrazilMonth({ date }: GetBrazilMonthParams): string {
	const local = new Date(date.getTime() - BRAZIL_OFFSET_IN_MINUTES * 60 * 1000);

	return local.toISOString().slice(0, 7);
}

type GetBrazilMonthParams = {
	date: Date;
};
