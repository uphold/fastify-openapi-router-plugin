import { DECORATOR_NAME } from './utils/constants.js';
import { createNotImplementedError, errors } from './errors/index.js';
import { parse } from './parser/index.js';

const createRoute = (fastify, routes, notImplementedErrorMapper) => {
  const missingRoutes = new Set(Object.values(routes));

  const addMissingRoutes = () => {
    missingRoutes.forEach(route => {
      fastify.route({
        ...route,
        handler: () => {
          if (typeof notImplementedErrorMapper === 'function') {
            const error = notImplementedErrorMapper(createNotImplementedError());

            if (error instanceof Error) {
              throw error;
            }

            throw createNotImplementedError();
          }

          throw createNotImplementedError();
        }
      });
    });

    missingRoutes.clear();
  };

  const addRoute = ({ method, onRequest, operationId, schema, url, ...routeOptions }) => {
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

    missingRoutes.delete(route);
  };

  return {
    addMissingRoutes,
    addRoute
  };
};

const plugin = async (fastify, options) => {
  options = options ?? {};

  const routes = await parse(options);

  const { addMissingRoutes, addRoute } = createRoute(fastify, routes, options.notImplementedErrorMapper);

  // Decorate fastify object.
  fastify.decorate(DECORATOR_NAME, {
    errors,
    installNotImplementedRoutes: addMissingRoutes,
    route: addRoute
  });

  // Avoid decorating the request with reference types.
  // Any mutation will impact all requests.
  fastify.decorateRequest(DECORATOR_NAME, null);

  // Instead, decorate each incoming request.
  fastify.addHook('onRequest', async request => {
    request[DECORATOR_NAME] = {
      operation: {},
      security: {},
      securityReport: []
    };
  });
};

export default plugin;
