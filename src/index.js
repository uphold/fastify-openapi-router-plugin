import { PLUGIN_NAME } from './utils/constants.js';
import fp from 'fastify-plugin';
import plugin from './plugin.js';

export default fp(plugin, {
  fastify: '4.x',
  name: PLUGIN_NAME
});
