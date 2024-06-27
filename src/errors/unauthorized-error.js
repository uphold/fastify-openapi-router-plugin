import createError from '@fastify/error';

const UnauthorizedError = createError('FST_OAS_UNAUTHORIZED', 'Unauthorized', 401);

const createUnauthorizedError = securityReport => {
  const err = new UnauthorizedError();

  Object.defineProperty(err, 'securityReport', {
    enumerable: false,
    value: securityReport
  });

  return err;
};

export { UnauthorizedError, createUnauthorizedError };
