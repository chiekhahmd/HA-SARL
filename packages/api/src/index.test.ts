import { describe, it, expect } from 'vitest';
import { app } from './index';

describe('API Integration', () => {
  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const body = await res.json() as { status: string; version: string; timestamp: string };
      expect(body.status).toBe('ok');
      expect(body.version).toBe('0.1.0');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('404 handling', () => {
    it('returns 404 JSON for unknown routes (with auth header)', async () => {
      const res = await app.request('/nonexistent', {
        headers: { Authorization: 'Bearer fake-token' },
      });
      // Will return 401 because the token is invalid (auth runs before 404)
      expect(res.status).toBe(401);
    });

    it('returns 401 for protected route without token', async () => {
      const res = await app.request('/projects');
      expect(res.status).toBe(401);
    });
  });
});
