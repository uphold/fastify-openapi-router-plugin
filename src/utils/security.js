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
  const missingScopes = requiredScopes.filter(requiredScope => {
    const hasMatchingScope = providedScopes.some(providedScope => {
      if (providedScope.endsWith('*')) {
        const prefixScope = providedScope.match(/(.*)\*$/)[1];

        return requiredScope.startsWith(prefixScope);
      }

      return providedScope === requiredScope;
    });

    return !hasMatchingScope;
  });

  return missingScopes;
};
