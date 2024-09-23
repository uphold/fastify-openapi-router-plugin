# @uphold/fastify-openapi-router-plugin

[![Tests](https://github.com/uphold/fastify-openapi-router-plugin/actions/workflows/tests.yaml/badge.svg)](https://github.com/uphold/fastify-openapi-router-plugin/actions/workflows/tests.yaml)

A plugin for [Fastify](https://fastify.dev) to connect routes with a OpenAPI 3.x specification. It does so by:

- Providing a way to register routes using the `operationId` defined in your specification instead of having to manually call `fastify.route` with the correct URL, method, and schema.
- Handling `securitySchemes` and `security` keywords defined in your specification, simplifying the implementation of authentication and authorization middleware.

## Installation

```bash
npm install @uphold/fastify-openapi-router-plugin
```

This plugin is written and exported in ESM only. If you are using CommonJS, consider making a pull-request and we will happily review it.

## Usage

```js
import Fastify from 'fastify';
import openApiRouterPlugin from '@uphold/fastify-openapi-router-plugin';

const fastify = Fastify();

// Register the OpenAPI Router plugin.
await fastify.register(openApiRouterPlugin, {
  spec: './petstore.json'
});

// Register a route using the 'operationId'.
fastify.oas.route({
  operationId: 'getPetById',
  handler: async (request, reply) => {
    const { petId } = request.params;

    const pet = await retrievePetFromDB(petId);

    return pet;
  }
});
```

### Options

You can pass the following options during the plugin registration:

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: './petstore.json',
  securityHandlers: {
    APIAuth: (value, request) => {}
  }
});
```

| Option | Type | Description |
| ------ | ---- | ----------  |
| `spec` | `string` or `object` | **REQUIRED**. A file path or object of your OpenAPI specification. |
| `securityHandlers` | `object` | An object containing the security handlers that match [Security Schemes](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-scheme-object) described in your OpenAPI specification. |
| `securityErrorMapper` | `function` | A function that allows mapping the default `UnauthorizedError` to a custom error. |

#### `spec`

If you don't provide a valid OpenAPI specification, the plugin will throw an error telling you what's wrong.

**Sample using a file path**

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: './petstore.json' // or spec: './petstore.yaml'
});
```

**Sample using an object**

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: {
    openapi: '3.1.0',
    ...
  }
});
```

#### `securityHandlers`

If you haven't defined any [Security Schemes](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-scheme-object) in your OpenAPI specification, this option won't be required. Otherwise, plugin will try to resolve every `securityHandlers.<name>` as an async function that matches `securitySchemes.<name>` in your OpenAPI specification.

Security handlers are executed as a `onRequest` hook for every API operation if plugin founds a [Security Requirement Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-requirement-object) defined on the root level or operation level of your OpenAPI specification. According to [Fastify Lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/), it is the most secure way to implement an authentication layer because it avoids parsing the body for unauthorized accesses.

If your operation's `security` use repeated security schemes, the plugin will call the associated security handler only once per request and cache its result. Furthermore, the plugin is smart enough to skip `security` blocks that have missing values from the request. For example, if you have a `security` block with `APIKey` and `OAuth2` and the request contains the API key but no bearer token, the plugin will automatically skip the block altogether without calling any security handler.

The security handler should either throw an error or return an object with `{ data, scopes }` where `data` becomes available as `request.oas.security.<name>` in your route handler and `scopes` is array of strings that will be used to verify if the scopes defined in the API operation are satisfied.

**Sample using OAuth 2.0**

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: {
    openapi: '3.1.0',
    ...
    paths: {
      '/pet/{petId}': {
        get: {
          operationId: 'getPetById',
          ...
          security: [
            { OAuth2: ['pets:read'] }
          ]
        }
      }
    }
    components: {
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          flows: {
            ...
          }
        }
      }
    }
  },
  securityHandlers: {
    OAuth2: async (token, request) => {
      // Validate and decode token.
      const { userId } = verifyToken(token);

      return {
        data: { userId },
        scopes: tokenData.scopes
      };
    }
  }
});
```

> [!TIP]
> The `scopes` returned by the security handler can contain **wildcards**. For example, if the security handler returns `{ scopes: ['pets:*'] }`, the route will be authorized for any security scope that starts with `pets:`.

> [!IMPORTANT]
> If your specification uses `http` security schemes with `in: cookie`, you must register [@fastify/cookie](https://github.com/fastify/fastify-cookie) before this plugin.

#### `securityErrorMapper`

The plugin will throw an `UnauthorizedError` when none of the `security` blocks succeed. By default, this error originates a `401` reply with `{ code: 'FST_OAS_UNAUTHORIZED', 'message': 'Unauthorized' }` as the payload. You can override this behavior by leveraging the `securityErrorMapper` option:

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: './petstore.json',
  securityHandlers: {
    OAuth2: async (request, reply) => {
      // ...
    }
  },
  securityErrorMapper: (unauthorizedError) => {
    // Use `unauthorizedError.securityReport` to perform logic and return a custom error.
    return MyUnauthorizedError();
  },
});
```

The `securityReport` property of the unauthorized error contains an array of objects with the following structure:

```js
[
  {
    ok: false,
    // Schemes can be an empty object if the security block was skipped due to missing values.
    schemes: {
      OAuth2: {
        ok: false,
        // Error thrown by the security handler or fastify.oas.errors.ScopesMismatchError if the scopes were not satisfied.
        error: new Error(),
      }
    }
  }
]
```

If you don't define a `securityErrorMapper`, you can still catch the `UnauthorizedError` in your fastify error handler.

### Decorators

#### `fastify.oas.route(options)`

This method is used to register a new route by translating the given `operationId` to a compliant Fastify route.

`options` must be an object containing at least the `operationId` and `handler(request, reply)`. All the available [routes options](https://fastify.dev/docs/latest/Reference/Routes/#routes-options) can be used except `method`, `url` and `schema` because those are loaded from your OpenAPI specification.

**Example**

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: './petstore.json'
});

fastify.oas.route({
  operationId: 'getPetById',
  handler: (request, reply) => {}
});
```

#### `fastify.oas.errors`

This object contains all error classes that can be thrown by the plugin:

- `UnauthorizedError`: Thrown when all security schemes verification failed.
- `ScopesMismatchError`: Thrown when the scopes returned by the security handler do not satisfy the scopes defined in the API operation.

#### `request.oas`

For your convenience, the object `request.oas` is populated with data related to the request being made. This is an object containing `{ operation, security, securityReport }`, where:

- `operation` is the raw API operation that activated the Fastify route.
- `security` is an object where keys are security scheme names and values the returned `data` field from security handlers.
- `securityReport`: A detailed report of the security verification process. Check the [`securityErrorMapper`](#security-error-mapper) section for more information.

**Example**

```js
await fastify.register(import('@fastify/fastify-openapi-router-plugin'), {
  spec: './petstore.json',
  securityHandlers: {
    OAuth2: async (request, reply) => {
      // Validate and decode token.
      const { userId, scopes } = verifyToken(token);

      return {
        data: { userId },
        scopes,
      };
    }
  }
});

fastify.oas.route({
  operationId: 'getPetById',
  handler: (request, reply) => {
    const { petId } = request.params;
    const { userId } = request.oas.security.PetStoreAuth;

    return getPetById(petId, userId);
  }
});
```

### Caveats

#### Coercing of `parameters`

This plugin configures Fastify to coerce `parameters` to the correct type based on the schema, [style and explode](https://swagger.io/docs/specification/serialization/) keywords defined in the OpenAPI specification. However, there are limitations. Here's an overview:

- Coercing of all primitive types is supported, like `number` and `boolean`.
- Coercing of `array` types are supported, albeit with limited styles:
  - Path: simple.
  - Query: form with exploded enabled or disabled.
  - Headers: simple.
  - Cookies: no support.
- Coercing of `object` types is not supported.

If your API needs improved coercion support, like `object` types or `cookie` parameters, please [fill an issue](https://github.com/uphold/fastify-openapi-router-plugin/issues/new) to discuss the implementation.

## License

[MIT](./LICENSE)

## Contributing

### Development

Install dependencies:

```bash
npm i
```

Run tests:

```bash
npm run test
```

Run tests and update snapshots:

```bash
npm run test -- -u
```

### Cutting a release

The release process is automated via the [release](https://github.com/uphold/fastify-openapi-router-plugin/actions/workflows/release.yaml) GitHub workflow. Run it by clicking the "Run workflow" button.
