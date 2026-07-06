/**
 * Tenant Resolver Middleware
 *
 * Extracts tenant_id from the authenticated user's JWT claims,
 * looks up the tenant config from the registry, and attaches
 * the tenant's database connection to the Hono context.
 *
 * Must run AFTER auth middleware (depends on userId and tenantId in context).
 */
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { tenantRegistry, TenantRecord } from '../tenant/registry';
import { tenantDbManager, TenantDb } from '../db/client';

// Extend Hono's context variables type
declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string;
    tenant: TenantRecord;
    tenantDb: TenantDb;
  }
}

export const tenantResolver = () => {
  return createMiddleware(async (c, next) => {
    // tenant_id should already be set by auth middleware
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      throw new HTTPException(401, {
        message: 'No tenant associated with this user',
      });
    }

    // Look up tenant config from DynamoDB (cached)
    const tenant = await tenantRegistry.get(tenantId);

    if (!tenant) {
      throw new HTTPException(403, {
        message: `Tenant '${tenantId}' not found`,
      });
    }

    if (!tenant.is_active) {
      throw new HTTPException(403, {
        message: 'Tenant account is disabled',
      });
    }

    // Get database connection for this tenant
    const db = await tenantDbManager.getConnection(tenant.db_name);

    // Attach to context for use in route handlers
    c.set('tenant', tenant);
    c.set('tenantDb', db);

    await next();
  });
};
