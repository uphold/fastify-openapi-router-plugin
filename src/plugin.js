import { DECORATOR_NAME } from './utils/constants.js';
import { errors } from './errors/index.js';
import { parse } from './parser/index.js';

const createRoute = (fastify, routes) => {
  return ({ method, onRequest, operationId, schema, url, ...routeOptions }) => {
    const route = routes[operationId];

    // Throw an error if the operation is unknown.
    if (!route) {
      throw new TypeError(`Missing '${operationId}' in OpenAPI spec.`);
    }

    // Not allowed to override options inferred by the spec.
    if (method || schema || url) {
      throw new TypeError(`Not allowed to override 'method', 'schema' or 'url' for operation '${operationId}'.`);
    }

    // Check if there is a routeOptions.onRequest hook.
    if (typeof onRequest === 'function') {
      route.onRequest.push(onRequest);
    }

    // Register a new route.
    fastify.route({
      ...routes[operationId],
      ...routeOptions
    });
  };
};

const plugin = async (fastify, options) => {
  options = options ?? {};

  const routes = await parse(options);

  // Decorate fastify object.
  fastify.decorate(DECORATOR_NAME, {
    errors,
    route: createRoute(fastify, routes)
  });

  // Decorate request.
  fastify.decorateRequest(DECORATOR_NAME, {
    operation: {},
    security: {},
    securityReport: []
  });
};

export default plugin;
