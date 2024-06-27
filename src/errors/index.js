import { ScopesMismatchError, createScopesMismatchError } from './scopes-mismatch-error.js';
import { UnauthorizedError, createUnauthorizedError } from './unauthorized-error.js';

const errors = {
  ScopesMismatchError,
  UnauthorizedError
};

export { createScopesMismatchError, createUnauthorizedError, errors };
