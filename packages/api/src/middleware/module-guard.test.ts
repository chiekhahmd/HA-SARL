import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { moduleGuard } from './module-guard';
import { TenantRecord } from '../tenant/registry';

const mockTenant: TenantRecord = {
  tenant_id: 'test-tenant',
  db_name: 'test_db',
  display_name: 'Test Company',
  config: {
    modules: ['projects', 'workers', 'time-tracking'],
    branding: {},
    locale: 'en-US',
    currency: 'TND',
    alert_lead_time_days: 30,
  },
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
};

function createTestApp(moduleName: string) {
  const app = new Hono();

  // Simulate tenant being set in context (normally done by tenant-resolver)
  app.use('*', async (c, next) => {
    c.set('tenant', mockTenant);
    await next();
  });

  // Apply module guard
  app.use('*', moduleGuard(moduleName));

  // Simple handler
  app.get('/', (c) => c.json({ ok: true }));

  return app;
}

describe('moduleGuard middleware', () => {
  it('allows access when module is enabled', async () => {
    const app = createTestApp('projects');
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('allows access for another enabled module', async () => {
    const app = createTestApp('workers');
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });

  it('returns 403 when module is disabled', async () => {
    const app = createTestApp('vehicles');
    const res = await app.request('/');
    expect(res.status).toBe(403);
  });

  it('returns 403 for non-existent module', async () => {
    const app = createTestApp('invoicing');
    const res = await app.request('/');
    expect(res.status).toBe(403);
  });

  it('error message mentions the module name', async () => {
    const app = createTestApp('vehicles');
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('vehicles');
  });

  it('returns 500 if tenant is not resolved', async () => {
    const app = new Hono();
    // No tenant set in context
    app.use('*', moduleGuard('projects'));
    app.get('/', (c) => c.json({ ok: true }));

    const res = await app.request('/');
    expect(res.status).toBe(500);
  });
});
