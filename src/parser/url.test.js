import { describe, expect, it } from 'vitest';
import { parseUrl } from './url.js';

describe('parseUrl()', () => {
  it('should transform OpenAPI path templates to Fastify patterns', () => {
    expect(parseUrl('/path')).toBe('/path');
    expect(parseUrl('/path/{id}')).toBe('/path/:id');
    expect(parseUrl('/path/{id}/resource/{another_id}')).toBe('/path/:id/resource/:another_id');
    expect(parseUrl('/path/{id}/{another_id}')).toBe('/path/:id/:another_id');
  });
});
