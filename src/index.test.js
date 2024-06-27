import { beforeEach, describe, expect, it, vi } from 'vitest';
import OpenAPIRouter from './index.js';
import fastify from 'fastify';

describe('Fastify plugin', () => {
  let spec;

  beforeEach(() => {
    spec = {
      info: { title: 'Title', version: '1' },
      openapi: '3.1.0',
      paths: {
        '/pets': {
          get: {
            operationId: 'getPets'
          }
        }
      }
    };
  });

  it('should default export', () => {
    expect(OpenAPIRouter).toBeTypeOf('function');
  });

  it('should expose plugin methods', async () => {
    const app = fastify({ logger: false });

    await app.register(OpenAPIRouter, { spec });

    expect(app.oas).toBeTypeOf('object');
    expect(app.oas).toMatchObject({
      route: expect.any(Function)
    });

    app.oas.route({
      handler: request => request.oas,
      operationId: 'getPets'
    });

    const result = await app.inject({ url: '/pets' });

    expect(result.json()).toMatchObject({
      operation: { operationId: 'getPets' },
      security: {}
    });
  });

  it('should throw registering a route if `operationId` is not in spec', async () => {
    const app = fastify({ logger: false });

    await app.register(OpenAPIRouter, { spec });

    expect(() =>
      app.oas.route({
        handler: () => {},
        operationId: 'getUnknown'
      })
    ).toThrowError(`Missing 'getUnknown' in OpenAPI spec.`);
  });

  it('should set a route-level onRequest hook', async () => {
    const app = fastify({ logger: false });
    const onRequest = vi.fn(async () => {});

    await app.register(OpenAPIRouter, { spec });

    app.oas.route({
      handler: async () => {},
      onRequest,
      operationId: 'getPets'
    });

    await app.inject({ url: '/pets' });

    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('should not override internal route options', async () => {
    const app = fastify({ logger: false });

    await app.register(OpenAPIRouter, { spec });

    expect(() =>
      app.oas.route({
        handler: async () => {},
        method: 'PUT',
        operationId: 'getPets',
        url: '/pets/:id'
      })
    ).toThrowError(`Not allowed to override 'method', 'schema' or 'url' for operation 'getPets'.`);
  });
});
