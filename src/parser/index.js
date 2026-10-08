import { DECORATOR_NAME } from '../utils/constants.js';
import { applyParamsCoercing, parseParams } from './params.js';
import { applySecurity, validateSecurity } from './security.js';
import { parseBody } from './body.js';
import { parseResponse } from './response.js';
import { parseUrl } from './url.js';
import { validateSpec } from './spec.js';

/**
 * HTTP methods that may appear as keys of an OpenAPI Path Item Object.
 *
 * A Path Item Object also carries non-method keys — `summary`, `description`, `servers`,
 * `parameters`, `$ref`, `summary`. Iterating every key of the object previously turned each of
 * them into a "route", so a spec with a path-level `summary` produced `method: "SUMMARY"`, and
 * `installNotImplementedRoutes()` then aborted server start with
 * `FST_ERR_ROUTE_METHOD_NOT_SUPPORTED` during `app.ready()`.
 */

const HTTP_METHODS = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace']);

/**
 * Merge path-item level parameters into an operation.
 *
 * Per OpenAPI, `paths['/x'].parameters` applies to every operation under that path, and an
 * operation-level entry with the same `name` and `in` overrides it. Previously only the
 * operation-level array was read, so declared path/query/header parameters were never validated or
 * coerced and the handler received whatever the client sent.
 *
 * @param {object[]} pathParameters Parameters declared on the Path Item Object.
 * @param {object[]} operationParameters Parameters declared on the Operation Object.
 * @returns {object[]} The effective parameter list.
 */

export const mergeParameters = (pathParameters, operationParameters) => {
  if (!Array.isArray(pathParameters) || pathParameters.length === 0) {
    return Array.isArray(operationParameters) ? operationParameters : [];
  }

  if (!Array.isArray(operationParameters) || operationParameters.length === 0) {
    return pathParameters;
  }

  const overridden = new Set(operationParameters.map(param => `${param.in}:${param.name}`));

  return [...pathParameters.filter(param => !overridden.has(`${param.in}:${param.name}`)), ...operationParameters];
};

export const parse = async options => {
  const routes = {};

  const spec = await validateSpec(options);

  await validateSecurity(spec, options);

  // Parse all existing paths.
  for (const path in spec.paths) {
    const pathItem = spec.paths[path];

    // Parse each path method.
    for (const method in pathItem) {
      if (!HTTP_METHODS.has(method.toLowerCase())) {
        // `summary`, `description`, `servers`, `parameters` and `$ref` are not operations.
        continue;
      }

      const operation = pathItem[method];

      // A path-level `parameters` array applies to every operation under this path.
      const parameters = mergeParameters(pathItem.parameters, operation.parameters);
      const effectiveOperation = parameters === operation.parameters ? operation : { ...operation, parameters };

      const securityFn = applySecurity(effectiveOperation, spec, options.securityHandlers, options.securityErrorMapper);
      const paramsCoercingFn = applyParamsCoercing(effectiveOperation);

      // Build fastify route.
      const route = {
        method: method.toUpperCase(),
        onRequest: [
          async function openApiRouterOnRequestHook(request) {
            request[DECORATOR_NAME].operation = effectiveOperation;

            await securityFn?.(request);
            paramsCoercingFn?.(request);
          }
        ],
        schema: {
          headers: parseParams(parameters, 'header'),
          params: parseParams(parameters, 'path'),
          query: parseParams(parameters, 'query'),
          response: {}
        },
        url: parseUrl(path)
      };

      // Parse body and apply its schema to fastify route.
      parseBody(route, effectiveOperation);

      // Parse responses.
      parseResponse(route, effectiveOperation);

      // Finally, add route to global routes object.
      routes[effectiveOperation.operationId] = route;
    }
  }

  return routes;
};
