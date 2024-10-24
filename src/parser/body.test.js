import { beforeEach, describe, expect, it } from 'vitest';
import { parseBody } from './body.js';

describe('parseBody()', () => {
  let route;

  beforeEach(() => {
    route = {
      schema: { body: {}, headers: { properties: {}, required: [] } }
    };
  });

  it('should do nothing if operation does not contain a response body', () => {
    parseBody(route, {});
    parseBody(route, { requestBody: {} });

    expect(route.schema.body).toStrictEqual({});
    expect(route.schema.headers).toStrictEqual({
      properties: {},
      required: []
    });
  });

  it('should parse a valid OpenAPI requestBody object', () => {
    const requestBody = {
      content: {
        'application/json': {
          schema: {
            foo: { type: 'string' },
            required: ['foo']
          }
        }
      }
    };

    parseBody(route, { requestBody });

    expect(route.schema.body).toStrictEqual({
      foo: { type: 'string' },
      required: ['foo']
    });
    expect(route.schema.headers).toStrictEqual({
      properties: { 'content-type': { const: 'application/json' } },
      required: ['content-type']
    });
  });

  it('should pick the first content-type if requestBody object has more than one', () => {
    const schema = {
      foo: { type: 'string' },
      required: ['foo']
    };
    const requestBody = {
      content: {
        'application/json': { schema },
        'application/xml': { schema }
      }
    };

    parseBody(route, { requestBody });

    expect(route.schema.body).toStrictEqual({
      foo: { type: 'string' },
      required: ['foo']
    });
    expect(route.schema.headers).toStrictEqual({
      properties: { 'content-type': { const: 'application/json' } },
      required: ['content-type']
    });
  });

  it('should sanitize body schema', () => {
    const schema = {
      bar: { discriminator: { propertyName: 'type' }, type: 'object' },
      foo: { example: 'baz', type: 'string', xml: { name: 'foo' } },
      required: ['foo'],
      xml: { name: 'Bar' }
    };
    const requestBody = {
      content: {
        'application/json': { schema }
      }
    };

    parseBody(route, { requestBody });

    expect(route.schema.body).toStrictEqual({
      bar: { type: 'object' },
      foo: { type: 'string' },
      required: ['foo']
    });
    expect(route.schema.headers).toStrictEqual({
      properties: { 'content-type': { const: 'application/json' } },
      required: ['content-type']
    });
  });
});
