import OpenAPIParser from '@readme/openapi-parser';

export const validateSpec = async options => {
  const spec = await OpenAPIParser.validate(options.spec);

  const version = spec.openapi ?? spec.swagger;
  const majorVersion = Number(version?.split?.('.')[0]);

  if (isNaN(majorVersion) || majorVersion < 3 || majorVersion >= 4) {
    throw new TypeError(`Unsupported OpenAPI version: ${version ?? 'unknown'}`);
  }

  return spec;
};
