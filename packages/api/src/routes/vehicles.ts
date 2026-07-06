/**
 * Vehicle Routes — Manager/Admin only.
 *
 * POST   /vehicles       — Create vehicle
 * GET    /vehicles       — List all with current insurance status
 * GET    /vehicles/:id   — Get vehicle with all insurance periods
 * PATCH  /vehicles/:id   — Update description
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createVehicleSchema, updateVehicleSchema } from '../types/schemas';
import { vehicles, insurancePeriods } from '../db/schema';

export const vehicleRoutes = new Hono();

vehicleRoutes.use('*', moduleGuard('vehicles'));

// POST /vehicles
vehicleRoutes.post('/', authorize('manager', 'admin'), zValidator('json', createVehicleSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  // Check for duplicate identifier
  const [existing] = await db.select().from(vehicles).where(eq(vehicles.identifier, body.identifier)).limit(1);
  if (existing) {
    throw new HTTPException(409, { message: `Vehicle with identifier '${body.identifier}' already exists` });
  }

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      identifier: body.identifier,
      description: body.description || null,
    })
    .returning();

  return c.json(vehicle, 201);
});

// GET /vehicles
vehicleRoutes.get('/', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const allVehicles = await db.select().from(vehicles);

  // Attach current insurance period for each vehicle
  const vehiclesWithInsurance = await Promise.all(
    allVehicles.map(async (vehicle) => {
      const [currentPeriod] = await db
        .select()
        .from(insurancePeriods)
        .where(eq(insurancePeriods.vehicleId, vehicle.id))
        .orderBy(desc(insurancePeriods.endDate))
        .limit(1);

      return { ...vehicle, currentInsurancePeriod: currentPeriod || null };
    }),
  );

  return c.json(vehiclesWithInsurance);
});

// GET /vehicles/:id
vehicleRoutes.get('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle) {
    throw new HTTPException(404, { message: 'Vehicle not found' });
  }

  const periods = await db
    .select()
    .from(insurancePeriods)
    .where(eq(insurancePeriods.vehicleId, id))
    .orderBy(desc(insurancePeriods.startDate));

  return c.json({ ...vehicle, insurancePeriods: periods });
});

// PATCH /vehicles/:id
vehicleRoutes.patch('/:id', authorize('manager', 'admin'), zValidator('json', updateVehicleSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Vehicle not found' });
  }

  const [updated] = await db
    .update(vehicles)
    .set({ description: body.description, updatedAt: new Date() })
    .where(eq(vehicles.id, id))
    .returning();

  return c.json(updated);
});
