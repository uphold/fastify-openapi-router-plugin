import createError from '@fastify/error';

const SecurityHandlerError = createError('FST_OAS_SECURITY_HANDLER_ERROR', 'Security handler has thrown an error', 403);

const createSecurityHandlerError = (handlerError, fatal = true) => {
  const err = new SecurityHandlerError();

  err.fatal = fatal;
  err.cause = handlerError;

  return err;
};

export { SecurityHandlerError, createSecurityHandlerError };
