/**
 * Tenant Config Route — any authenticated user.
 *
 * GET /tenant/config — Returns branding, modules, locale, currency for the frontend.
 */
import { Hono } from 'hono';

export const tenantConfigRoutes = new Hono();

// GET /config — Return tenant configuration for the frontend
tenantConfigRoutes.get('/config', async (c) => {
  const tenant = c.get('tenant');

  return c.json({
    tenantId: tenant.tenant_id,
    displayName: tenant.display_name,
    modules: tenant.config.modules,
    branding: tenant.config.branding,
    locale: tenant.config.locale,
    currency: tenant.config.currency,
  });
});
