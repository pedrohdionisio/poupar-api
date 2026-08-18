import type { z } from 'zod';

const SCHEMA_METADATA_KEY = 'custom:schema';

export type ControllerSchema = {
	body?: z.ZodSchema;
	params?: z.ZodSchema;
	query?: z.ZodSchema;
};

export function Schema(schema: ControllerSchema): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(SCHEMA_METADATA_KEY, schema, target);
	};
}

export function getSchema(target: any): ControllerSchema | undefined {
	return Reflect.getMetadata(SCHEMA_METADATA_KEY, target.constructor);
}
