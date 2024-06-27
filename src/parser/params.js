import { addPropertyToSchema } from '../utils/schema.js';

export const parseParams = (parameters, location) => {
  const schema = {
    properties: {},
    required: [],
    type: 'object'
  };

  // Parameters is always an array in OpenAPI and we need a 'location' to proceed.
  if (!Array.isArray(parameters) || !location) {
    return schema;
  }

  // Filter params by location.
  const params = parameters.filter(param => param.in === location);

  // Add params to schema.
  for (const param of params) {
    addPropertyToSchema(schema, { [param.name]: param.schema }, param.required);
  }

  return schema;
};
