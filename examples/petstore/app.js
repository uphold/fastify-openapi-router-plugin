import Fastify from 'fastify';
import openApiRouter from '../../src/index.js';

const localFile = fileName => new URL(fileName, import.meta.url).pathname;

const spec = localFile('./petstore.json');

const fastify = Fastify({
  logger: true
});

// Register the plugin.
await fastify.register(openApiRouter, {
  securityHandlers: {
    api_key: async () => {},
    petstore_auth: async () => {
      return {
        data: {
          user: { name: 'John Doe' }
        },
        scopes: ['read:pets']
      };
    }
  },
  spec
});

// Declare route.
fastify.oas.route({
  handler: (request, reply) => {
    reply.send({
      id: request.params.petId,
      name: 'Pet',
      photoUrls: ['foo', 'bar']
    });
  },
  operationId: 'getPetById'
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
