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

export const applyParamsCoercing = operation => {
  // Skip if operation has no parameters.
  if (!operation.parameters) {
    return;
  }

  const coerceArrayParametersFns = operation.parameters
    .filter(param => param.schema.type === 'array')
    .map(param => {
      switch (param.in) {
        case 'header':
          if (!param.style || param.style == 'simple') {
            const lowercaseName = param.name.toLowerCase();

            return request => {
              const value = request.header[lowercaseName];

              if (value && !Array.isArray(value)) {
                request.header[lowercaseName] = value.split(',');
              }
            };
          }

          break;

        case 'path':
          if (!param.style || param.style === 'simple') {
            return request => {
              const value = request.params[param.name];

              if (value && !Array.isArray(value)) {
                request.params[param.name] = value.split(',');
              }
            };
          }

          break;

        case 'query':
          if (!param.style || param.style === 'form') {
            if (param.explode === false) {
              return request => {
                const value = request.query[param.name];

                if (value && !Array.isArray(value)) {
                  request.query[param.name] = value.split(',');
                }
              };
            } else {
              return request => {
                const value = request.query[param.name];

                if (value && !Array.isArray(value)) {
                  request.query[param.name] = [value];
                }
              };
            }
          }

          break;
      }
    })
    .filter(Boolean);

  return request => {
    coerceArrayParametersFns.forEach(fn => fn(request));
  };
};
