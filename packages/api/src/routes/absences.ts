/**
 * Absence Routes — Worker (own), Manager/Admin (all).
 *
 * POST   /absences       — Create absence (with overlap check)
 * GET    /absences       — List (worker sees own, manager sees all)
 * DELETE /absences/:id   — Delete (manager/admin only)
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, lte, gte, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createAbsenceSchema } from '../types/schemas';
import { absences, workers } from '../db/schema';

export const absenceRoutes = new Hono();

absenceRoutes.use('*', moduleGuard('absences'));

// POST /absences
absenceRoutes.post('/', authorize('worker', 'manager', 'admin'), zValidator('json', createAbsenceSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');
  const userId = c.get('userId');

  // Find worker for current user
  const [worker] = await db.select().from(workers).where(eq(workers.userId, userId)).limit(1);
  if (!worker) {
    throw new HTTPException(400, { message: 'No worker record associated with your user account' });
  }

  // Check for overlapping absences
  const overlapping = await db
    .select()
    .from(absences)
    .where(
      and(
        eq(absences.workerId, worker.id),
        // Overlap condition: existing.start <= new.end AND existing.end >= new.start
        lte(absences.startDate, body.endDate),
        gte(absences.endDate, body.startDate),
      ),
    )
    .limit(1);

  if (overlapping.length > 0) {
    throw new HTTPException(409, {
      message: 'Absence overlaps with an existing absence for this worker',
    });
  }

  const [absence] = await db
    .insert(absences)
    .values({
      workerId: worker.id,
      startDate: body.startDate,
      endDate: body.endDate,
      absenceType: body.absenceType,
      notes: body.notes || null,
    })
    .returning();

  return c.json(absence, 201);
});

// GET /absences
absenceRoutes.get('/', authorize('worker', 'manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const role = c.get('userRole');
  const userId = c.get('userId');
  const workerId = c.req.query('workerId');

  // Workers see only their own
  if (role === 'worker') {
    const [worker] = await db.select().from(workers).where(eq(workers.userId, userId)).limit(1);
    if (!worker) return c.json([]);

    const entries = await db
      .select()
      .from(absences)
      .where(eq(absences.workerId, worker.id))
      .orderBy(desc(absences.startDate));
    return c.json(entries);
  }

  // Manager/Admin: filter by worker if specified
  if (workerId) {
    const entries = await db
      .select()
      .from(absences)
      .where(eq(absences.workerId, workerId))
      .orderBy(desc(absences.startDate));
    return c.json(entries);
  }

  const entries = await db.select().from(absences).orderBy(desc(absences.startDate));
  return c.json(entries);
});

// DELETE /absences/:id
absenceRoutes.delete('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(absences).where(eq(absences.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Absence not found' });
  }

  await db.delete(absences).where(eq(absences.id, id));
  return c.json({ message: 'Absence deleted' });
});
