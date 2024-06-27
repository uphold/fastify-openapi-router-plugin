import { describe, expect, it } from 'vitest';
import { parseParams } from './params.js';

describe('parseParams()', () => {
  it('should return an empty schema when passing invalid arguments', () => {
    const emptySchema = {
      properties: {},
      required: [],
      type: 'object'
    };

    expect(parseParams()).toStrictEqual(emptySchema);
    expect(parseParams([])).toStrictEqual(emptySchema);
    expect(parseParams([], 'foo')).toStrictEqual(emptySchema);
    expect(parseParams([{}], 'foo')).toStrictEqual(emptySchema);
    expect(parseParams([{ in: 'path', name: 'bar', schema: {} }])).toStrictEqual(emptySchema);
    expect(parseParams([{ in: 'path', name: 'bar', schema: {} }], 'foo')).toStrictEqual(emptySchema);
  });

  it('should parse a single OpenAPI parameter', () => {
    const params = [
      {
        in: 'path',
        name: 'foo',
        required: true,
        schema: {
          type: 'integer'
        }
      }
    ];

    expect(parseParams(params, 'path')).toStrictEqual({
      properties: { foo: { type: 'integer' } },
      required: ['foo'],
      type: 'object'
    });
  });

  it('should parse OpenAPI parameters by type', () => {
    const params = [
      { in: 'path', name: 'foo', required: true, schema: { type: 'integer' } },
      { in: 'path', name: 'bar', schema: { type: 'integer' } },
      { in: 'header', name: 'x-foo', schema: { format: 'uuid', type: 'string' } },
      { in: 'header', name: 'x-bar', required: true, schema: { format: 'uuid', type: 'string' } },
      { in: 'query', name: 'qfoo', schema: { type: 'integer' } },
      { in: 'query', name: 'qbar', required: true, schema: { type: 'integer' } },
      { in: 'cookie', name: 'debug', schema: { type: 'integer' } }
    ];
    const pathParamsSchema = {
      properties: { bar: { type: 'integer' }, foo: { type: 'integer' } },
      required: ['foo'],
      type: 'object'
    };
    const headerParamsSchema = {
      properties: {
        'x-bar': { format: 'uuid', type: 'string' },
        'x-foo': { format: 'uuid', type: 'string' }
      },
      required: ['x-bar'],
      type: 'object'
    };
    const queryParamsSchema = {
      properties: { qbar: { type: 'integer' }, qfoo: { type: 'integer' } },
      required: ['qbar'],
      type: 'object'
    };

    expect(parseParams(params, 'path')).toStrictEqual(pathParamsSchema);
    expect(parseParams(params, 'header')).toStrictEqual(headerParamsSchema);
    expect(parseParams(params, 'query')).toStrictEqual(queryParamsSchema);
  });
});
