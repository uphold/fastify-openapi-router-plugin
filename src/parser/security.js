import { DECORATOR_NAME } from '../utils/constants.js';
import { createUnauthorizedError } from '../errors/index.js';
import { extractSecuritySchemeValueFromRequest, verifyScopes } from '../utils/security.js';
import _ from 'lodash-es';
import pProps from 'p-props';

export const parseSecurity = (operation, spec, securityHandlers, securityErrorMapper) => {
  // Use the operation security if it's defined, otherwise fallback to the spec global security.
  const operationSecurity = operation.security ?? spec.security ?? [];

  // Return undefined handler if there's no security for the operation.
  if (operationSecurity.length === 0) {
    return;
  }

  const securitySchemes = spec.components.securitySchemes;

  // Return the Fastify 'onRequest' hook.
  return async request => {
    const valuesCache = new Map();
    const promisesCache = new Map();
    const report = [];

    const readSchemeValue = name => {
      // Values can be cached per security scheme name.
      if (!valuesCache.has(name)) {
        var value = extractSecuritySchemeValueFromRequest(request, securitySchemes[name]);

        if (value != null) {
          valuesCache.set(name, value);
        }
      }

      return valuesCache.get(name);
    };

    const callSecurityHandler = async name => {
      // Handler calls can be cached per security scheme name.
      const value = readSchemeValue(name);
      let promise = promisesCache.get(name);

      if (!promise) {
        promise = new Promise(resolve => resolve(securityHandlers[name](value, request)));
        promisesCache.set(name, promise);
      }

      return await promise;
    };

    // Iterate over each security on the array, calling each one a `block`.
    // Each block is an object with security scheme names as keys and required scopes as values.
    // For example: { apiKey: [], oauth2: ['write'] }
    for (const block of operationSecurity) {
      // Skip the whole block if at least one entry value is missing in the request.
      // Consider this example: { apiKey: [] oauth2: [] }
      // If there's no API key in the request, the whole security block can be skipped.
      const blockHasMissingValues = Object.keys(block).some(name => readSchemeValue(name) == null);

      if (blockHasMissingValues) {
        report.push({ ok: false, schemes: {} });
        continue;
      }

      // Iterate over each security scheme in the block and call the security handler.
      // We leverage cache when calling the handler to avoid multiple calls to the same function
      const blockResults = await pProps(block, async (requiredScopes, name) => {
        try {
          const resolved = await callSecurityHandler(name);
          const { data, scopes } = resolved ?? {};

          // Verify scopes, which throws if scopes are missing.
          verifyScopes(scopes ?? [], requiredScopes);

          return { data, ok: true };
        } catch (error) {
          return { error, ok: false };
        }
      });

      // Requirements in a block are AND'd together.
      const ok = Object.values(blockResults).every(result => result.ok);

      report.push({ ok, schemes: blockResults });

      // Blocks themselves are OR'd together, so we can break early if one block passes.
      if (ok) {
        break;
      }
    }

    // If all security blocks have failed, then the last block result will be an error.
    // In this case, throw an unauthorized error which can be mapped in fastify's error handler to something different.
    const lastResult = report[report.length - 1];

    if (!lastResult.ok) {
      const error = createUnauthorizedError(report);

      throw securityErrorMapper?.(error) ?? error;
    }

    // Otherwise, we can safely use the last result to decorate the request.
    request[DECORATOR_NAME].security = _.mapValues(lastResult.schemes, scheme => scheme.data);
    request[DECORATOR_NAME].securityReport = report;
  };
};

export const validateSecurity = (spec, options) => {
  const securitySchemes = spec.components?.securitySchemes;

  // Check if 'securityHandlers' option is defined as an object.
  if (options.securityHandlers != null && !_.isPlainObject(options.securityHandlers)) {
    throw new TypeError(`Expected 'options.securitySchemes' to be an object.`);
  }

  // Check if all declared security schemes have a valid handler.
  for (const schemeKey in securitySchemes) {
    const handler = options.securityHandlers?.[schemeKey];

    if (typeof handler !== 'function') {
      throw new TypeError(
        `Missing or invalid 'options.securityHandlers.${schemeKey}'. Please provide a function for the given security scheme.`
      );
    }
  }
};
