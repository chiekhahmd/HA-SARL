/**
 * Insurance Period Routes — Manager/Admin only.
 *
 * POST   /vehicles/:vehicleId/insurance-periods   — Add insurance period
 * GET    /vehicles/:vehicleId/insurance-periods   — List insurance periods
 * PATCH  /insurance-periods/:id                   — Update period
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createInsurancePeriodSchema, updateInsurancePeriodSchema } from '../types/schemas';
import { insurancePeriods, vehicles } from '../db/schema';

export const insurancePeriodRoutes = new Hono();

insurancePeriodRoutes.use('*', moduleGuard('insurance'));

// POST /vehicles/:vehicleId/insurance-periods
insurancePeriodRoutes.post('/vehicles/:vehicleId/insurance-periods', authorize('manager', 'admin'), zValidator('json', createInsurancePeriodSchema), async (c) => {
  const { vehicleId } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  // Verify vehicle exists
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
  if (!vehicle) {
    throw new HTTPException(404, { message: 'Vehicle not found' });
  }

  const [period] = await db
    .insert(insurancePeriods)
    .values({
      vehicleId,
      startDate: body.startDate,
      endDate: body.endDate,
      insurer: body.insurer || null,
      policyNumber: body.policyNumber || null,
    })
    .returning();

  return c.json(period, 201);
});

// GET /vehicles/:vehicleId/insurance-periods
insurancePeriodRoutes.get('/vehicles/:vehicleId/insurance-periods', authorize('manager', 'admin'), async (c) => {
  const { vehicleId } = c.req.param();
  const db = c.get('tenantDb');

  const periods = await db
    .select()
    .from(insurancePeriods)
    .where(eq(insurancePeriods.vehicleId, vehicleId))
    .orderBy(desc(insurancePeriods.startDate));

  return c.json(periods);
});

// PATCH /insurance-periods/:id
insurancePeriodRoutes.patch('/:id', authorize('manager', 'admin'), zValidator('json', updateInsurancePeriodSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(insurancePeriods).where(eq(insurancePeriods.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Insurance period not found' });
  }

  const updateData: Record<string, unknown> = {};
  if (body.startDate) updateData.startDate = body.startDate;
  if (body.endDate) updateData.endDate = body.endDate;
  if (body.insurer !== undefined) updateData.insurer = body.insurer;
  if (body.policyNumber !== undefined) updateData.policyNumber = body.policyNumber;

  const [updated] = await db
    .update(insurancePeriods)
    .set(updateData)
    .where(eq(insurancePeriods.id, id))
    .returning();

  return c.json(updated);
});
