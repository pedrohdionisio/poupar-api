import 'reflect-metadata';

const ADMIN_ONLY_METADATA_KEY = 'custom:adminOnly';

export function AdminOnly() {
	return (target: object) => {
		Reflect.defineMetadata(ADMIN_ONLY_METADATA_KEY, true, target);
	};
}

export function isAdminOnly(target: any): boolean {
	return (
		Reflect.getMetadata(ADMIN_ONLY_METADATA_KEY, target.constructor) ?? false
	);
}
