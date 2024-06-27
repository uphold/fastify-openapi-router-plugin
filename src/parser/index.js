import { DECORATOR_NAME } from '../utils/constants.js';
import { parseBody } from './body.js';
import { parseParams } from './params.js';
import { parseResponse } from './response.js';
import { parseSecurity, validateSecurity } from './security.js';
import { parseUrl } from './url.js';
import { validateSpec } from './spec.js';

export const parse = async options => {
  const routes = {};

  const spec = await validateSpec(options);

  await validateSecurity(spec, options);

  // Parse all existing paths.
  for (const path in spec.paths) {
    const methods = spec.paths[path];

    // Parse each path method.
    for (const method in methods) {
      const operation = methods[method];

      // Build fastify route.
      const route = {
        method: method.toUpperCase(),
        onRequest: [
          async function (request) {
            request[DECORATOR_NAME].operation = operation;
          },
          parseSecurity(operation, spec, options.securityHandlers)
        ].filter(Boolean),
        schema: {
          headers: parseParams(operation.parameters, 'header'),
          params: parseParams(operation.parameters, 'path'),
          query: parseParams(operation.parameters, 'query'),
          response: {}
        },
        url: parseUrl(path)
      };

      // Parse body and apply its schema to fastify route.
      parseBody(route, operation);

      // Parse responses.
      parseResponse(route, operation);

      // Finally, add route to global routes object.
      routes[operation.operationId] = route;
    }
  }

  return routes;
};