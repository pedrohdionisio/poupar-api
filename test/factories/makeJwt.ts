type MakeJwtParams = {
	groups?: string[];
	claims?: Record<string, unknown>;
};

export function makeJwt({ groups, claims }: MakeJwtParams = {}): string {
	const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
		'base64url'
	);
	const payload = Buffer.from(
		JSON.stringify({
			...(groups && { 'cognito:groups': groups }),
			...claims
		})
	).toString('base64url');

	return `${header}.${payload}.signature`;
}
