import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { tenantResolver } from './middleware/tenant-resolver';

const app = new Hono();

// ============================================================================
// MIDDLEWARE CHAIN (order matters)
// ============================================================================

// 1. Error handler — catches all errors, returns consistent JSON format
app.use('*', errorHandler());

// 2. Auth — verifies JWT, extracts claims (skips public routes)
app.use('*', authMiddleware());

// 3. Tenant resolver — looks up tenant config, attaches DB connection
//    (skips public routes since they have no tenantId)
app.use('*', async (c, next) => {
  // Only resolve tenant for authenticated requests
  if (c.get('tenantId')) {
    const resolver = tenantResolver();
    return resolver(c, next);
  }
  await next();
});

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PROTECTED ROUTES (to be added in Tasks 8-19)
// ============================================================================

// TODO: app.route('/tenant', tenantConfigRoutes);
// TODO: app.route('/users', userRoutes);
// TODO: app.route('/projects', projectRoutes);
// TODO: app.route('/workers', workerRoutes);
// TODO: app.route('/time-entries', timeEntryRoutes);
// TODO: app.route('/absences', absenceRoutes);
// TODO: app.route('/materials', materialRoutes);
// TODO: app.route('/material-allocations', materialAllocationRoutes);
// TODO: app.route('/vehicles', vehicleRoutes);
// TODO: app.route('/insurance-periods', insurancePeriodRoutes);
// TODO: app.route('/reports', reportRoutes);

// ============================================================================
// FALLBACK
// ============================================================================

app.notFound((c) => {
  return c.json(
    { error: { code: 'NOT_FOUND', message: `Route not found: ${c.req.method} ${c.req.path}` } },
    404,
  );
});

// ============================================================================
// EXPORTS
// ============================================================================

// Lambda handler (used in production)
export const handler = handle(app);

// App instance (used for local dev server and testing)
export { app };
