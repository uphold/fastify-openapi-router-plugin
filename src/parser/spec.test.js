import { describe, expect, it } from 'vitest';
import { validateSpec } from './spec.js';

describe('validateSpec()', () => {
  it('should throw for invalid options', async () => {
    await expect(validateSpec({})).rejects.toThrow('Expected a file path, URL, or object.');
    await expect(validateSpec({ spec: { foo: 'bar' } })).rejects.toThrow(
      'Supplied schema is not a valid OpenAPI definition'
    );
  });

  it('should throw an error on unsupported OpenAPI versions', async () => {
    const specSwagger2 = {
      info: {
        title: 'Title',
        version: '1'
      },
      paths: {},
      swagger: '2.0'
    };

    await expect(validateSpec({ spec: specSwagger2 })).rejects.toThrow(/Unsupported OpenAPI version: '2\.0'\./);
  });

  it('should return a parsed spec', async () => {
    const spec = {
      info: {
        title: 'Title',
        version: '1'
      },
      openapi: '3.1.0',
      paths: {
        '/pet': {
          get: {
            responses: {
              200: {
                description: 'successful operation'
              }
            }
          }
        }
      }
    };

    expect(await validateSpec({ spec })).toMatchObject(spec);
  });

  it("should resolve '$ref' in spec", async () => {
    const Pet = {
      properties: {
        name: {
          type: 'string'
        }
      },
      type: 'object'
    };
    const spec = {
      components: {
        schemas: {
          Pet
        }
      },
      info: {
        title: 'Title',
        version: '1'
      },
      openapi: '3.1.0',
      paths: {
        '/pet': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Pet'
                    }
                  }
                },
                description: 'successful operation'
              }
            }
          }
        }
      }
    };

    const parsedSpec = await validateSpec({ spec });
    const { schema } = parsedSpec.paths['/pet'].get.responses['200'].content['application/json'];

    expect(parsedSpec).toMatchObject(spec);
    expect(schema).toMatchObject(Pet);
  });
});
