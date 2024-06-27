import { addPropertyToSchema, removeAttributesFromSchema } from '../utils/schema.js';

export const parseBody = (route, operation) => {
  if (!operation.requestBody?.content) {
    return;
  }

  // Pick the first body type because fastify only supports one per route.
  const [[contentType, { schema }]] = Object.entries(operation.requestBody.content);

  // Enforce the correct Content-Type.
  addPropertyToSchema(route.schema.headers, { 'content-type': { const: contentType } }, true);

  // Sanitize schema.
  removeAttributesFromSchema(schema, ['xml', 'example']);

  // Add request body schema.
  route.schema.body = schema;
};
