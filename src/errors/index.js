import { NotImplementedError, createNotImplementedError } from './not-implemented-error.js';
import { ScopesMismatchError, createScopesMismatchError } from './scopes-mismatch-error.js';
import { SecurityHandlerError, createSecurityHandlerError } from './security-handler-error.js';
import { UnauthorizedError, createUnauthorizedError } from './unauthorized-error.js';

const errors = {
  NotImplementedError,
  ScopesMismatchError,
  SecurityHandlerError,
  UnauthorizedError
};

export {
  createScopesMismatchError,
  createUnauthorizedError,
  createNotImplementedError,
  createSecurityHandlerError,
  errors
};
