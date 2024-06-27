export const parseUrl = url => {
  // fastify looks for a format 'resource/:param' but OpenAPI describes routes as 'resource/{param}'.
  return url.replace(/{(\w+)}/g, ':$1');
};
