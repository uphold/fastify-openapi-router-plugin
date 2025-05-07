import { DECORATOR_NAME } from '../utils/constants.js';
import { SecurityHandlerError } from '../errors/security-handler-error.js';
import { applySecurity, validateSecurity } from './security.js';
import { createSecurityHandlerError, errors } from '../errors/index.js';
import { describe, expect, it, vi } from 'vitest';

expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    val.cause.message = `${val.message}: ${val.cause.message}`;

    return printer(val.cause, config, indentation, depth, refs);
  },
  test: val => val instanceof SecurityHandlerError
});

describe('validateSecurity()', () => {
  it('should throw on invalid security handler option', () => {
    const spec = {
      components: {
        securitySchemes: {}
      }
    };

    expect.assertions(2);

    try {
      validateSecurity(spec, {
        securityHandlers: 'foo'
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toBe(`Expected 'options.securitySchemes' to be an object.`);
    }
  });

  it('should throw on missing security handlers', () => {
    const spec = {
      components: {
        securitySchemes: {
          foo: {}
        }
      }
    };

    expect.assertions(2);

    try {
      validateSecurity(spec, {
        securityHandlers: {}
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toBe(
        `Missing or invalid 'options.securityHandlers.foo'. Please provide a function for the given security scheme.`
      );
    }
  });

  it('should throw on invalid security handlers', () => {
    const spec = {
      components: {
        securitySchemes: {
          foo: {}
        }
      }
    };

    expect.assertions(2);

    try {
      validateSecurity(spec, {
        securityHandlers: { foo: {} }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toBe(
        `Missing or invalid 'options.securityHandlers.foo'. Please provide a function for the given security scheme.`
      );
    }
  });

  it('should not throw an error if all security handlers are present', () => {
    const spec = {
      components: {
        securitySchemes: {
          bar: {},
          foo: {}
        }
      }
    };

    validateSecurity(spec, {
      securityHandlers: { bar: () => {}, foo: () => {} }
    });
  });
});

describe('applySecurity()', () => {
  it('should return undefined if no security', async () => {
    expect(applySecurity({}, {}, {})).toBeUndefined();
    expect(applySecurity({ security: [] }, {}, {})).toBeUndefined();
    expect(applySecurity({}, { security: [] }, {})).toBeUndefined();
  });

  it('should return undefined if `security` is disabled in operation', async () => {
    const securityFn = applySecurity({ security: [] }, { security: [{ OAuth2: [] }] }, {});

    expect(securityFn).toBeUndefined();
  });

  it('should stop at the first successful security block', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        'X-API-KEY': 'api key',
        'X-API-KEY-2': 'api key 2',
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ ApiKey: [], OAuth2: [] }, { ApiKey2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          ApiKey2: { in: 'header', name: 'X-API-KEY-2', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      ApiKey: vi.fn(async () => ({ data: 'ApiKey data', scopes: [] })),
      ApiKey2: vi.fn(async () => ({ data: 'ApiKey2 data', scopes: [] })),
      OAuth2: vi.fn(async () => ({ data: 'OAuth2 data', scopes: [] }))
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    await securityFn(request);

    expect(securityHandlers.ApiKey).toHaveBeenCalledTimes(1);
    expect(securityHandlers.ApiKey).toHaveBeenCalledWith('api key', request);
    expect(securityHandlers.OAuth2).toHaveBeenCalledTimes(1);
    expect(securityHandlers.OAuth2).toHaveBeenCalledWith('bearer token', request);
    expect(securityHandlers.ApiKey2).not.toHaveBeenCalled();
    expect(request[DECORATOR_NAME].security).toMatchObject({ ApiKey: 'ApiKey data', OAuth2: 'OAuth2 data' });
    expect(request[DECORATOR_NAME].securityReport).toMatchInlineSnapshot(`
      [
        {
          "ok": true,
          "schemes": {
            "ApiKey": {
              "data": "ApiKey data",
              "ok": true,
            },
            "OAuth2": {
              "data": "OAuth2 data",
              "ok": true,
            },
          },
        },
      ]
    `);
  });

  it('should try second security block if the first one fails with a non-fatal error', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        'X-API-KEY': 'api key',
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ ApiKey: [] }, { OAuth2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      ApiKey: vi.fn(() => {
        throw createSecurityHandlerError(new Error('ApiKey error'), false);
      }),
      OAuth2: vi.fn(async () => ({ data: 'OAuth2 data', scopes: [] }))
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    await securityFn(request);

    expect(securityHandlers.ApiKey).toHaveBeenCalledTimes(1);
    expect(securityHandlers.ApiKey).toHaveBeenCalledWith('api key', request);
    expect(securityHandlers.OAuth2).toHaveBeenCalledTimes(1);
    expect(securityHandlers.OAuth2).toHaveBeenCalledWith('bearer token', request);
    expect(request[DECORATOR_NAME].security).toMatchObject({ OAuth2: 'OAuth2 data' });
    expect(request[DECORATOR_NAME].securityReport).toMatchInlineSnapshot(`
      [
        {
          "ok": false,
          "schemes": {
            "ApiKey": {
              "error": [Error: Security handler has thrown an error: ApiKey error],
              "ok": false,
            },
          },
        },
        {
          "ok": true,
          "schemes": {
            "OAuth2": {
              "data": "OAuth2 data",
              "ok": true,
            },
          },
        },
      ]
    `);
  });

  it('should stop when a security block fails with a fatal error', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        'X-API-KEY': 'api key',
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ ApiKey: [] }, { OAuth2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      ApiKey: vi.fn(() => {
        throw new Error('ApiKey error');
      }),
      OAuth2: vi.fn(async () => ({ data: 'OAuth2 data', scopes: [] }))
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    try {
      await securityFn(request);
    } catch (error) {
      expect(error).toBeInstanceOf(errors.UnauthorizedError);
      expect(error.securityReport).toMatchInlineSnapshot(`
        [
          {
            "ok": false,
            "schemes": {
              "ApiKey": {
                "error": [Error: Security handler has thrown an error: ApiKey error],
                "ok": false,
              },
            },
          },
        ]
      `);
    }
  });

  it('should throw an error if all security blocks fail', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        'X-API-KEY': 'api key',
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ ApiKey: [] }, { OAuth2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      ApiKey: vi.fn(() => {
        throw createSecurityHandlerError(new Error('ApiKey error'), false);
      }),
      OAuth2: vi.fn(() => {
        throw createSecurityHandlerError(new Error('OAuth2 error'), false);
      })
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    expect.assertions(2);

    try {
      await securityFn(request);
    } catch (err) {
      expect(err).toBeInstanceOf(errors.UnauthorizedError);
      expect(err.securityReport).toMatchInlineSnapshot(`
        [
          {
            "ok": false,
            "schemes": {
              "ApiKey": {
                "error": [Error: Security handler has thrown an error: ApiKey error],
                "ok": false,
              },
            },
          },
          {
            "ok": false,
            "schemes": {
              "OAuth2": {
                "error": [Error: Security handler has thrown an error: OAuth2 error],
                "ok": false,
              },
            },
          },
        ]
      `);
    }
  });

  it('should cache security handler calls', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ OAuth2: ['read'] }, { OAuth2: ['write'] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      OAuth2: vi.fn(async () => ({ data: 'OAuth2 data', scopes: ['write'] }))
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    await securityFn(request);

    expect(securityHandlers.OAuth2).toHaveBeenCalledTimes(1);
  });

  it('should cache security handler calls, even if they throw', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ OAuth2: ['read'] }, { OAuth2: ['write'] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      OAuth2: vi.fn(() => {
        throw new Error('OAuth2 error');
      })
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    expect.assertions(2);

    try {
      await securityFn(request);
    } catch (err) {
      expect(err).toBeInstanceOf(errors.UnauthorizedError);
      expect(securityHandlers.OAuth2).toHaveBeenCalledTimes(1);
    }
  });

  it('should skip security blocks that have at least one value missing', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ ApiKey: [] }, { OAuth2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          ApiKey: { in: 'header', name: 'X-API-KEY', type: 'apiKey' },
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      ApiKey: vi.fn(async () => ({ data: 'ApiKey data', scopes: [] })),
      OAuth2: vi.fn(async () => ({ data: 'OAuth2 data', scopes: [] }))
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    expect.assertions(3);

    await securityFn(request);

    expect(securityHandlers.ApiKey).not.toHaveBeenCalled();
    expect(securityHandlers.OAuth2).toHaveBeenCalledTimes(1);
    expect(request[DECORATOR_NAME].securityReport).toMatchInlineSnapshot(`
      [
        {
          "ok": false,
          "schemes": {},
        },
        {
          "ok": true,
          "schemes": {
            "OAuth2": {
              "data": "OAuth2 data",
              "ok": true,
            },
          },
        },
      ]
    `);
  });

  it('should validate scopes', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ OAuth2: ['write'] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      OAuth2: vi.fn(() => ({ data: 'OAuth2 data', scopes: ['read'] }))
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    expect.assertions(2);

    try {
      await securityFn(request);
    } catch (err) {
      expect(err).toBeInstanceOf(errors.UnauthorizedError);
      expect(err.securityReport).toMatchInlineSnapshot(`
        [
          {
            "ok": false,
            "schemes": {
              "OAuth2": {
                "error": [FastifyError: Scopes do not match required scopes],
                "ok": false,
              },
            },
          },
        ]
      `);
    }
  });

  it('should allow security handler to return undefined', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ OAuth2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      OAuth2: vi.fn(() => {})
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    await securityFn(request);

    expect(request[DECORATOR_NAME].security).toMatchObject({ OAuth2: undefined });
    expect(request[DECORATOR_NAME].securityReport).toMatchInlineSnapshot(`
      [
        {
          "ok": true,
          "schemes": {
            "OAuth2": {
              "data": undefined,
              "ok": true,
            },
          },
        },
      ]
    `);
  });

  it('should allow security handler to return undefined and still check scopes', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ OAuth2: ['read'] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      OAuth2: vi.fn(() => {})
    };

    const securityFn = applySecurity(operation, spec, securityHandlers);

    expect.assertions(2);

    try {
      await securityFn(request);
    } catch (err) {
      expect(err).toBeInstanceOf(errors.UnauthorizedError);
      expect(err.securityReport).toMatchInlineSnapshot(`
        [
          {
            "ok": false,
            "schemes": {
              "OAuth2": {
                "error": [FastifyError: Scopes do not match required scopes],
                "ok": false,
              },
            },
          },
        ]
      `);
    }
  });

  it('should map security errors by running the supplied mapper', async () => {
    const request = {
      [DECORATOR_NAME]: {},
      headers: {
        authorization: 'Bearer bearer token'
      }
    };
    const operation = {
      security: [{ OAuth2: [] }]
    };
    const spec = {
      components: {
        securitySchemes: {
          OAuth2: { type: 'oauth2' }
        }
      }
    };
    const securityHandlers = {
      OAuth2: vi.fn(() => {
        throw new Error('OAuth2 error');
      })
    };
    const customError = new Error('Mapped error');
    const securityErrorMapper = vi.fn(() => customError);

    const securityFn = applySecurity(operation, spec, securityHandlers, securityErrorMapper);

    expect.assertions(3);

    try {
      await securityFn(request);
    } catch (err) {
      expect(err).toBe(customError);
      expect(securityErrorMapper).toHaveBeenCalledTimes(1);
      expect(securityErrorMapper.mock.calls[0][0]).toBeInstanceOf(errors.UnauthorizedError);
    }
  });
});
