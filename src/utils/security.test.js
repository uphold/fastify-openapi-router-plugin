import { describe, expect, it } from 'vitest';
import { errors } from '../errors/index';
import { extractSecuritySchemeValueFromRequest, verifyScopes } from './security';
import _ from 'lodash-es';

describe('verifyScopes()', () => {
  const runTest = ({ missing, provided, required }) => {
    try {
      verifyScopes(provided, required);

      if (missing.length > 0) {
        throw new Error('Expected an error to be thrown');
      }
    } catch (err) {
      expect(err).toBeInstanceOf(errors.ScopesMismatchError);
      expect(err).toMatchObject({
        scopes: {
          missing: missing,
          provided: provided,
          required: required
        }
      });
    }
  };

  it('should verify regular scopes correctly against required scopes', async () => {
    const provided = ['read', 'write'];

    runTest({ missing: [], provided, required: [] });
    runTest({ missing: [], provided, required: ['read', 'write'] });
    runTest({ missing: [], provided, required: ['read'] });
    runTest({ missing: ['remove'], provided, required: ['read', 'write', 'remove'] });
    runTest({ missing: ['remove'], provided: ['read'], required: ['remove'] });
    runTest({ missing: [''], provided, required: [''] });
    runTest({ missing: ['read', 'write'], provided: [], required: ['read', 'write'] });
  });

  it('should verify regular scopes correctly against *', async () => {
    const provided = ['*'];

    runTest({ missing: [], provided, required: ['user'] });
    runTest({ missing: [], provided, required: ['user:'] });
    runTest({ missing: [], provided, required: ['user:foo'] });
    runTest({ missing: [], provided, required: ['user:foo:'] });
    runTest({ missing: [], provided, required: ['user:foo:bar'] });
    runTest({ missing: [], provided, required: ['user:foo:bar:'] });
    runTest({ missing: [], provided, required: [''] });
    runTest({ missing: [], provided, required: [] });
  });

  it('should verify regular scopes correctly against * suffix', async () => {
    let provided = ['user:*', 'transaction:foo:*'];

    runTest({ missing: [], provided, required: ['user:foo'] });
    runTest({ missing: [], provided, required: ['user:foo:bar'] });
    runTest({ missing: [], provided, required: ['user:'] });
    runTest({ missing: [], provided, required: ['transaction:foo:bar'] });
    runTest({ missing: [], provided, required: ['transaction:foo:'] });
    runTest({ missing: ['user'], provided, required: ['user'] });
    runTest({ missing: ['transaction:foo'], provided, required: ['transaction:foo'] });
    runTest({ missing: ['transaction::'], provided, required: ['transaction::'] });
    runTest({ missing: [''], provided, required: [''] });

    provided = ['user.*', 'transaction.foo.*'];

    runTest({ missing: [], provided, required: ['user.foo'] });
    runTest({ missing: [], provided, required: ['user.foo.bar'] });
    runTest({ missing: [], provided, required: ['user.'] });
    runTest({ missing: [], provided, required: ['transaction.foo.bar'] });
    runTest({ missing: [], provided, required: ['transaction.foo.'] });
    runTest({ missing: ['user'], provided, required: ['user'] });
    runTest({ missing: ['transaction.foo'], provided, required: ['transaction.foo'] });
    runTest({ missing: ['transaction..'], provided, required: ['transaction..'] });
    runTest({ missing: [''], provided, required: [''] });

    provided = ['user*', 'transaction:foo*'];

    runTest({ missing: [], provided, required: ['userfoo'] });
    runTest({ missing: [], provided, required: ['user'] });
    runTest({ missing: [], provided, required: ['transaction:foo'] });
    runTest({ missing: [], provided, required: ['transaction:foobar'] });
    runTest({ missing: ['use'], provided, required: ['use'] });
    runTest({ missing: ['transaction:foz'], provided, required: ['transaction:foz'] });
    runTest({ missing: [''], provided, required: [''] });
  });
});

describe('extractSecuritySchemeValueFromRequest()', () => {
  describe('oauth2', () => {
    const securityScheme = { type: 'oauth2' };

    it('should extract the bearer token from the authorization header', async () => {
      const request1 = _.set({}, 'headers.authorization', 'Bearer foo bar');
      const request2 = _.set({}, 'headers.authorization', 'bearer foo bar');

      expect(extractSecuritySchemeValueFromRequest(request1, securityScheme)).toBe('foo bar');
      expect(extractSecuritySchemeValueFromRequest(request2, securityScheme)).toBe('foo bar');
    });

    it('should return undefined if the authorization header is malformed', async () => {
      const request = _.set({}, 'headers.authorization', 'foo bar');

      expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
    });

    it('should return undefined if the authorization header is missing', async () => {
      const request = _.set({}, 'headers', {});

      expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
    });
  });

  describe('apiKey', () => {
    describe('in: cookie', () => {
      const securityScheme = { in: 'cookie', name: 'foo', type: 'apiKey' };

      it('should extract the value from the cookie', async () => {
        const request = _.set({}, 'cookies.foo', 'bar');

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBe('bar');
      });

      it('should return undefined if the cookie is missing', async () => {
        const request = _.set({}, 'cookies', {});

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });

      it('should return undefined if the are no cookies', async () => {
        const request = {};

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });
    });

    describe('in: header', () => {
      const securityScheme = { in: 'header', name: 'foo', type: 'apiKey' };

      it('should extract the value from the header', async () => {
        const request = _.set({}, 'headers.foo', 'bar');

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBe('bar');
      });

      it('should return undefined if the header is missing', async () => {
        const request = _.set({}, 'headers', {});

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });

      it('should return undefined if the are no headers', async () => {
        const request = {};

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });
    });

    describe('in: query', () => {
      const securityScheme = { in: 'query', name: 'foo', type: 'apiKey' };

      it('should extract the value from the query', async () => {
        const request = _.set({}, 'query.foo', 'bar');

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBe('bar');
      });

      it('should return undefined if the query is missing', async () => {
        const request = _.set({}, 'query', {});

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });

      it('should return undefined if the are no queries', async () => {
        const request = {};

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });
    });
  });

  describe('http', () => {
    describe('scheme: bearer', () => {
      const securityScheme = { scheme: 'bearer', type: 'http' };

      it('should extract the bearer token from the authorization header', async () => {
        const request1 = _.set({}, 'headers.authorization', 'Bearer foo bar');
        const request2 = _.set({}, 'headers.authorization', 'bearer foo bar');

        expect(extractSecuritySchemeValueFromRequest(request1, securityScheme)).toBe('foo bar');
        expect(extractSecuritySchemeValueFromRequest(request2, securityScheme)).toBe('foo bar');
      });

      it('should return undefined if the authorization header is malformed', async () => {
        const request = _.set({}, 'headers.authorization', 'foo bar');

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });

      it('should return undefined if the authorization header is missing', async () => {
        const request = _.set({}, 'headers', {});

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });
    });

    describe('scheme: basic', () => {
      const securityScheme = { scheme: 'basic', type: 'http' };

      it('should extract the username and password from the authorization header', async () => {
        const request = _.set({}, 'headers.authorization', 'Basic Zm9vOmJhcg==');

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toStrictEqual({
          password: 'bar',
          username: 'foo'
        });
      });

      it('should return undefined if the authorization header is malformed', async () => {
        const request1 = _.set({}, 'headers.authorization', 'foo');
        const request2 = _.set({}, 'headers.authorization', 'Basic foo');
        const request3 = _.set({}, 'headers.authorization', 'Basic _~#');

        expect(extractSecuritySchemeValueFromRequest(request1, securityScheme)).toBeUndefined();
        expect(extractSecuritySchemeValueFromRequest(request2, securityScheme)).toBeUndefined();
        expect(extractSecuritySchemeValueFromRequest(request3, securityScheme)).toBeUndefined();
      });

      it('should return undefined if the authorization header is missing', async () => {
        const request = _.set({}, 'headers', {});

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });

      it('should return undefined if the username or password is missing', async () => {
        const request = _.set({}, 'headers.authorization', 'Basic Zm9v');

        expect(extractSecuritySchemeValueFromRequest(request, securityScheme)).toBeUndefined();
      });
    });
  });
});
