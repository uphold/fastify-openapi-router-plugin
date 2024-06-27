import { beforeEach, describe, expect, it } from 'vitest';
import { parseResponse } from './response.js';

describe('parseResponse()', () => {
  let route;

  beforeEach(() => {
    route = { schema: { response: {} } };
  });

  it('should do nothing if operation has no responses', () => {
    parseResponse(route, {});
    parseResponse(route, { responses: {} });

    expect(route.schema.response).toStrictEqual({});
  });

  it('should parse a valid OpenAPI responses object', () => {
    const responses = {
      200: {
        content: {
          'application/json': {
            schema: {
              foo: { type: 'string' },
              required: ['foo']
            }
          }
        }
      }
    };

    parseResponse(route, { responses });

    expect(route.schema.response).toStrictEqual(responses);
  });

  it('should not parse responses without content', () => {
    const responses = {
      400: {
        description: 'Invalid ID supplied'
      }
    };

    parseResponse(route, { responses });

    expect(route.schema.response).toStrictEqual({});
  });

  it('should parse multiple content-types in a response', () => {
    const schema = {
      foo: { type: 'string' },
      required: ['foo']
    };
    const responses = {
      200: {
        content: {
          'application/json': { schema },
          'application/xml': { schema }
        }
      }
    };

    parseResponse(route, { responses });

    expect(route.schema.response).toStrictEqual(responses);
  });

  it('should parse multiple responses at once', () => {
    const responses = {
      200: {
        content: {
          'application/json': {
            schema: {
              foo: { type: 'string' },
              required: ['foo']
            }
          }
        },
        description: 'OK'
      },
      202: {
        content: {
          'application/json': {
            schema: {
              foo: { type: 'string' },
              required: ['foo']
            }
          },
          'text/plain': {
            schema: {
              type: 'string'
            }
          }
        },
        description: 'Accepted'
      },
      400: {
        description: 'Invalid ID supplied'
      },
      401: {
        description: 'Authorization denied'
      }
    };

    parseResponse(route, { responses });

    expect(route.schema.response).toStrictEqual({
      200: {
        content: {
          'application/json': {
            schema: {
              foo: { type: 'string' },
              required: ['foo']
            }
          }
        },
        description: 'OK'
      },
      202: {
        content: {
          'application/json': {
            schema: {
              foo: { type: 'string' },
              required: ['foo']
            }
          },
          'text/plain': {
            schema: {
              type: 'string'
            }
          }
        },
        description: 'Accepted'
      }
    });
  });
});
