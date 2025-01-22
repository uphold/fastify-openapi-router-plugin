import { ScopesMismatchError, createScopesMismatchError } from './scopes-mismatch-error.js';
import { SecurityHandlerError, createSecurityHandlerError } from './security-handler-error.js';
import { UnauthorizedError, createUnauthorizedError } from './unauthorized-error.js';

const errors = {
  ScopesMismatchError,
  SecurityHandlerError,
  UnauthorizedError
};

export { createScopesMismatchError, createUnauthorizedError, createSecurityHandlerError, errors };
