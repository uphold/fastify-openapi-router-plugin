import { addPropertyToSchema, removeAttributesFromSchema } from './schema.js';
import { describe, expect, it } from 'vitest';

describe('addPropertyToSchema()', () => {
  it('should add a property as required to a schema', async () => {
    const schema = {
      properties: {
        foo: { type: 'string' }
      },
      required: []
    };

    addPropertyToSchema(schema, { bar: { type: 'string' } }, true);

    expect(schema).toStrictEqual({
      properties: {
        bar: { type: 'string' },
        foo: { type: 'string' }
      },
      required: ['bar']
    });
  });

  it('should add a property as optional to a schema', async () => {
    const schema = {
      properties: {
        foo: { type: 'string' }
      },
      required: ['foo']
    };

    addPropertyToSchema(schema, { bar: { type: 'string' } }, false);

    expect(schema).toStrictEqual({
      properties: {
        bar: { type: 'string' },
        foo: { type: 'string' }
      },
      required: ['foo']
    });
  });

  it('should not override a property that already exists', async () => {
    const schema = {
      properties: {
        bar: { type: 'object' },
        foo: { type: 'string' }
      },
      required: ['foo']
    };

    addPropertyToSchema(schema, { foo: { type: 'object' } }, false);

    expect(schema).toStrictEqual({
      properties: {
        bar: { type: 'object' },
        foo: { type: 'string' }
      },
      required: ['foo']
    });
  });

  it('should add multiple properties', async () => {
    const schema = {
      properties: {},
      required: []
    };

    addPropertyToSchema(schema, { bar: { type: 'string' }, foo: { type: 'object' } }, false);

    expect(schema).toStrictEqual({
      properties: {
        bar: { type: 'string' },
        foo: { type: 'object' }
      },
      required: []
    });
  });
});

describe('removeAttributesFromSchema()', () => {
  it('should not throw error with invalid arguments', async () => {
    const t = () => {
      removeAttributesFromSchema();
      removeAttributesFromSchema(undefined, []);
      removeAttributesFromSchema({}, {});
      removeAttributesFromSchema({}, ['foo']);
      removeAttributesFromSchema({ foo: {} });
    };

    expect(t).not.toThrow();
  });

  it('should recursively remove unwanted attributes from a schema', async () => {
    const schema = {
      example: null,
      properties: {
        bar: {
          example: 'pending',
          type: 'string'
        },
        baz: {
          example: undefined,
          type: 'string',
          xml: {
            name: 'xml-title'
          }
        },
        foo: {
          discriminator: {
            mapping: {
              bar: 'baz',
              foo: 'foz'
            },
            propertyName: 'type'
          },
          example: 'approved',
          type: 'string'
        }
      },
      type: 'object',
      xml: { name: 'xml-schema' }
    };

    removeAttributesFromSchema(schema, ['xml', 'example', 'discriminator.mapping']);

    expect(schema).toStrictEqual({
      properties: {
        bar: {
          type: 'string'
        },
        baz: {
          type: 'string'
        },
        foo: {
          discriminator: { propertyName: 'type' },
          type: 'string'
        }
      },
      type: 'object'
    });
  });
});
