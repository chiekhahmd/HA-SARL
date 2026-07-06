/**
 * Module Guard Middleware
 *
 * Checks whether a specific module is enabled for the current tenant.
 * Returns 403 if the module is disabled in the tenant's config.
 *
 * Usage in route files:
 *   projectRoutes.use('*', moduleGuard('projects'));
 *   vehicleRoutes.use('*', moduleGuard('vehicles'));
 */
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { tenantRegistry } from '../tenant/registry';

export const moduleGuard = (moduleName: string) => {
  return createMiddleware(async (c, next) => {
    const tenant = c.get('tenant');

    if (!tenant) {
      throw new HTTPException(500, {
        message: 'Tenant not resolved (module guard must run after tenant resolver)',
      });
    }

    if (!tenantRegistry.isModuleEnabled(tenant, moduleName)) {
      throw new HTTPException(403, {
        message: `Module '${moduleName}' is not enabled for this tenant`,
      });
    }

    await next();
  });
};
