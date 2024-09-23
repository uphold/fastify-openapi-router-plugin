import { applyParamsCoercing, parseParams } from './params.js';
import { describe, expect, it } from 'vitest';

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

describe('applyParamsCoercing()', () => {
  it('should return undefined when operation has no parameters', () => {
    expect(applyParamsCoercing({})).toBeUndefined();
  });

  describe('header', () => {
    it('should ignore if value is not set', () => {
      const request = {
        header: {}
      };
      const operation = {
        parameters: [
          {
            in: 'header',
            name: 'foo',
            schema: { type: 'array' }
          }
        ]
      };

      applyParamsCoercing(operation)(request);

      expect(request.header).toStrictEqual({});
    });

    [
      // Default.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: {}
      },
      // Simple style.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { style: 'simple' }
      },
      // Simple style with explode explicitly set to true.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { explode: true, style: 'simple' }
      },
      // Simple style with explode set to false.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { explode: false, style: 'simple' }
      },
      // Ignore if already an array.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: ['a', 'b'], foz: 'c,d' },
        spec: { style: 'simple' }
      },
      // Unknown style.
      {
        expected: { foo: 'a,b', foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { style: 'foobar' }
      }
    ].forEach(({ expected, input, spec: { explode, style } }) => {
      it(`should coerce arrays when style is '${style}' and explode is '${explode}'`, () => {
        const request = {
          header: input
        };
        const operation = {
          parameters: [
            {
              explode,
              in: 'header',
              name: 'Foo',
              schema: { type: 'array' },
              style
            },
            {
              explode,
              in: 'header',
              name: 'Foz',
              schema: { type: 'string' },
              style
            }
          ]
        };

        applyParamsCoercing(operation)(request);

        expect(request.header).toStrictEqual(expected);
      });
    });
  });

  describe('path', () => {
    it('should ignore if value is not set', () => {
      const request = {
        params: {}
      };
      const operation = {
        parameters: [
          {
            in: 'path',
            name: 'foo',
            schema: { type: 'array' }
          }
        ]
      };

      applyParamsCoercing(operation)(request);

      expect(request.params).toStrictEqual({});
    });

    [
      // Default.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: {}
      },
      // Simple style.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { style: 'simple' }
      },
      // Simple style with explode explicitly set to true.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { explode: true, style: 'simple' }
      },
      // Simple style with explode set to false.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { explode: false, style: 'simple' }
      },
      // Ignore if already an array.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: ['a', 'b'], foz: 'c,d' },
        spec: { style: 'simple' }
      },
      // Unknown style.
      {
        expected: { foo: 'a,b', foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { style: 'foobar' }
      }
    ].forEach(({ expected, input, spec: { explode, style } }) => {
      it(`should coerce arrays when style is '${style}' and explode is '${explode}'`, () => {
        const request = {
          params: input
        };
        const operation = {
          parameters: [
            {
              explode,
              in: 'path',
              name: 'foo',
              schema: { type: 'array' },
              style
            },
            {
              explode,
              in: 'path',
              name: 'foz',
              schema: { type: 'string' },
              style
            }
          ]
        };

        applyParamsCoercing(operation)(request);

        expect(request.params).toStrictEqual(expected);
      });
    });
  });

  describe('query', () => {
    it('should ignore if value is not set', () => {
      const request = {
        query: {}
      };
      const operation = {
        parameters: [
          {
            in: 'query',
            name: 'foo',
            schema: { type: 'array' }
          }
        ]
      };

      applyParamsCoercing(operation)(request);

      expect(request.query).toStrictEqual({});
    });

    [
      // Default.
      {
        expected: { foo: ['a,b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: {}
      },
      // Form style.
      {
        expected: { foo: ['a,b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { style: 'form' }
      },
      // Form style with explode explicitly set to true.
      {
        expected: { foo: ['a,b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { explode: true, style: 'form' }
      },
      // Form style with explode set to false.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { explode: false, style: 'form' }
      },
      // Ignore if already an array.
      {
        expected: { foo: ['a', 'b'], foz: 'c,d' },
        input: { foo: ['a', 'b'], foz: 'c,d' },
        spec: { style: 'form' }
      },
      // Ignore if already an array.
      {
        expected: { foo: 'a,b', foz: 'c,d' },
        input: { foo: 'a,b', foz: 'c,d' },
        spec: { style: 'foobar' }
      }
    ].forEach(({ expected, input, spec: { explode, style } }) => {
      it(`should coerce arrays when style is '${style}' and explode is '${explode}'`, () => {
        const request = {
          query: input
        };
        const operation = {
          parameters: [
            {
              explode,
              in: 'query',
              name: 'foo',
              schema: { type: 'array' },
              style
            },
            {
              explode,
              in: 'query',
              name: 'foz',
              schema: { type: 'string' },
              style
            }
          ]
        };

        applyParamsCoercing(operation)(request);

        expect(request.query).toStrictEqual(expected);
      });
    });
  });
});
