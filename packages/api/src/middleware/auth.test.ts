import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authorize } from './auth';

/**
 * Auth middleware tests.
 *
 * Note: Full JWT verification tests require mocking jose.jwtVerify which
 * depends on JWKS. We test the authorize() helper directly here (it's the
 * role-checking logic), and test auth middleware integration in E2E tests.
 */

function createAppWithRole(userRole: string) {
  const app = new Hono();

  // Simulate auth middleware having already set the role
  app.use('*', async (c, next) => {
    c.set('userRole', userRole as 'admin' | 'manager' | 'worker');
    c.set('userId', 'test-user-id');
    c.set('userEmail', 'test@example.com');
    c.set('tenantId', 'test-tenant');
    await next();
  });

  return app;
}

describe('authorize() middleware', () => {
  it('allows admin access to admin-only route', async () => {
    const app = createAppWithRole('admin');
    app.get('/admin', authorize('admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/admin');
    expect(res.status).toBe(200);
  });

  it('allows manager access to manager route', async () => {
    const app = createAppWithRole('manager');
    app.get('/projects', authorize('manager', 'admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/projects');
    expect(res.status).toBe(200);
  });

  it('allows admin access to manager route', async () => {
    const app = createAppWithRole('admin');
    app.get('/projects', authorize('manager', 'admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/projects');
    expect(res.status).toBe(200);
  });

  it('denies worker access to admin-only route', async () => {
    const app = createAppWithRole('worker');
    app.get('/admin', authorize('admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/admin');
    expect(res.status).toBe(403);
  });

  it('denies worker access to manager route', async () => {
    const app = createAppWithRole('worker');
    app.get('/projects', authorize('manager', 'admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/projects');
    expect(res.status).toBe(403);
  });

  it('allows worker access to worker route', async () => {
    const app = createAppWithRole('worker');
    app.get('/time-entries', authorize('worker', 'manager', 'admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/time-entries');
    expect(res.status).toBe(200);
  });

  it('error message mentions required roles', async () => {
    const app = createAppWithRole('worker');
    app.get('/admin', authorize('admin'), (c) => c.json({ ok: true }));

    const res = await app.request('/admin');
    const body = await res.text();
    expect(body).toContain('admin');
  });
});

describe('authMiddleware — missing token', () => {
  it('returns 401 when no Authorization header', async () => {
    const app = new Hono();
    // Import the real auth middleware
    const { authMiddleware } = await import('./auth');
    app.use('*', authMiddleware());
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const app = new Hono();
    const { authMiddleware } = await import('./auth');
    app.use('*', authMiddleware());
    app.get('/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic abc123' },
    });
    expect(res.status).toBe(401);
  });

  it('allows access to /health without auth', async () => {
    const app = new Hono();
    const { authMiddleware } = await import('./auth');
    app.use('*', authMiddleware());
    app.get('/health', (c) => c.json({ status: 'ok' }));

    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });
});
