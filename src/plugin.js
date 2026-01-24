import { DECORATOR_NAME } from './utils/constants.js';
import { createNotImplementedError, errors } from './errors/index.js';
import { parse } from './parser/index.js';

const createRouting = (routes, notImplementedErrorMapper) => {
  const missingRoutes = new Set(Object.values(routes));

  const addMissingRoutes = fastify => {
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

  const addRoute = (fastify, { method, onRequest, operationId, schema, url, ...routeOptions }) => {
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
    } else if (Array.isArray(onRequest)) {
      route.onRequest.push(...onRequest);
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

  const { addMissingRoutes, addRoute } = createRouting(routes, options.notImplementedErrorMapper);

  // Decorate fastify object.
  fastify.decorate(DECORATOR_NAME, {
    getter: function () {
      const fastify = this;

      return {
        errors,
        installNotImplementedRoutes: () => addMissingRoutes(fastify),
        route: route => addRoute(fastify, route)
      };
    }
  });

  // Avoid decorating the request with reference types.
  // Any mutation will impact all requests.
  fastify.decorateRequest(DECORATOR_NAME, null);

  // Instead, decorate each incoming request.
  fastify.addHook('onRequest', async function openApiRouterGlobalOnRequestHook(request) {
    request[DECORATOR_NAME] = {
      operation: {},
      security: {},
      securityReport: []
    };
  });
};

export default plugin;
