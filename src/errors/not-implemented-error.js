import createError from '@fastify/error';

const NotImplementedError = createError('FST_OAS_NOT_IMPLEMENTED', 'Not implemented', 501);

const createNotImplementedError = () => {
  const err = new NotImplementedError();

  return err;
};

export { NotImplementedError, createNotImplementedError };
