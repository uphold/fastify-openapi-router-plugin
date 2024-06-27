import createError from '@fastify/error';

const ScopesMismatchError = createError('FST_OAS_SCOPES_MISMATCH', 'Scopes do not match required scopes', 403);

const createScopesMismatchError = (providedScopes, requiredScopes, missingScopes) => {
  const err = new ScopesMismatchError();

  err.scopes = {
    missing: missingScopes,
    provided: providedScopes,
    required: requiredScopes
  };

  return err;
};

export { ScopesMismatchError, createScopesMismatchError };
