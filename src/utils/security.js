import { createScopesMismatchError } from '../errors/index.js';
import _ from 'lodash-es';

const getValueForHttpSchemeType = (request, securityScheme) => {
  if (securityScheme.scheme === 'bearer') {
    const [, bearer] = request.headers.authorization?.match(/^Bearer (.+)$/i) ?? [];

    return bearer;
  }

  if (securityScheme.scheme === 'basic') {
    const [, basic] = request.headers.authorization?.match(/^Basic (.+)$/i) ?? [];

    if (!basic) {
      return;
    }

    const basicDecoded = Buffer.from(basic, 'base64').toString();
    const [, username, password] = basicDecoded.match(/^([^:]*):(.*)$/) ?? [];

    if (!username || !password) {
      return;
    }

    return { password, username };
  }
};

const getValueForApiKeySchemeType = (request, securityScheme) => {
  let source;

  if (securityScheme.in === 'cookie') {
    source = request.cookies;
  } else if (securityScheme.in === 'header') {
    source = request.headers;
  } else if (securityScheme.in === 'query') {
    source = request.query;
  }

  return source?.[securityScheme.name];
};

const getValueForOAuthOrOpenIdConnectSchemeType = request => {
  const [, bearer] = request.headers.authorization?.match(/^Bearer (.+)$/i) ?? [];

  return bearer;
};

export const extractSecuritySchemeValueFromRequest = (request, securityScheme) => {
  if (securityScheme.type === 'oauth2' || securityScheme.type === 'openIdConnect') {
    return getValueForOAuthOrOpenIdConnectSchemeType(request);
  }

  if (securityScheme.type === 'apiKey') {
    return getValueForApiKeySchemeType(request, securityScheme);
  }

  if (securityScheme.type === 'http') {
    return getValueForHttpSchemeType(request, securityScheme);
  }
};

export const verifyScopes = (providedScopes, requiredScopes) => {
  const missingScopes = [];

  requiredScopes.forEach(requiredScope => {
    if (providedScopes.includes(requiredScope)) {
      return;
    }

    const parts = requiredScope.split(':');
    const wildcardScopes = parts.map((part, index) => {
      return _.trimStart(parts.slice(0, index).join(':') + ':*', ':');
    });

    const matches = wildcardScopes.some(matchingScope => providedScopes.includes(matchingScope));

    if (!matches) {
      missingScopes.push(requiredScope);
    }
  });

  if (missingScopes.length > 0) {
    throw createScopesMismatchError(providedScopes, requiredScopes, missingScopes);
  }
};
