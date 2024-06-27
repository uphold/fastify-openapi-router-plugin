import OpenAPIParser from '@readme/openapi-parser';

export const validateSpec = async options => {
  return await OpenAPIParser.validate(options.spec);
};
