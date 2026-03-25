import { parse, validate } from '@readme/openapi-parser';

export const validateSpec = async options => {
  const validation = await validate(options.spec);

  if (!validation.valid) {
    throw Object.assign(new TypeError('Supplied schema is not a valid OpenAPI definition.'), validation);
  }

  const spec = await parse(options.spec);

  const version = spec.openapi ?? spec.swagger;
  const majorVersion = Number(version?.split?.('.')[0]);

  if (isNaN(majorVersion) || majorVersion < 3 || majorVersion >= 4) {
    throw new TypeError(`Unsupported OpenAPI version: '${version ?? 'unknown'}'.`);
  }

  return spec;
};
