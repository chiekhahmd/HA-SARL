/**
 * Time Entry Routes — Worker (own), Manager/Admin (all).
 *
 * POST   /time-entries       — Create time entry (auto-compute labor cost)
 * GET    /time-entries       — List (worker sees own, manager sees all)
 * PATCH  /time-entries/:id   — Update hours/project (recompute cost)
 * DELETE /time-entries/:id   — Delete (manager/admin only)
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc, lte } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createTimeEntrySchema, updateTimeEntrySchema } from '../types/schemas';
import { timeEntries, workers, projects, costRateHistory } from '../db/schema';

export const timeEntryRoutes = new Hono();

timeEntryRoutes.use('*', moduleGuard('time-tracking'));

// POST /time-entries
timeEntryRoutes.post('/', authorize('worker', 'manager', 'admin'), zValidator('json', createTimeEntrySchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');
  const userId = c.get('userId');
  const role = c.get('userRole');

  let workerId: string;

  if (role === 'worker') {
    // Workers can only log time for themselves
    const [worker] = await db.select().from(workers).where(eq(workers.userId, userId)).limit(1);
    if (!worker) {
      throw new HTTPException(400, { message: 'No worker record associated with your user account' });
    }
    workerId = worker.id;
  } else {
    // Managers/Admins must specify which worker via workerId in body
    if (!body.workerId) {
      throw new HTTPException(400, { message: 'workerId is required for managers/admins' });
    }
    // Verify worker exists
    const [worker] = await db.select().from(workers).where(eq(workers.id, body.workerId)).limit(1);
    if (!worker) {
      throw new HTTPException(400, { message: 'Worker not found' });
    }
    workerId = body.workerId;
  }

  // Verify project exists
  const [project] = await db.select().from(projects).where(eq(projects.id, body.projectId)).limit(1);
  if (!project) {
    throw new HTTPException(400, { message: 'Project not found' });
  }

  // Get effective cost rate for the entry date
  const effectiveRate = await getEffectiveRate(db, workerId, body.entryDate);

  // Compute labor cost
  const laborCost = body.hours * effectiveRate;

  const [entry] = await db
    .insert(timeEntries)
    .values({
      workerId,
      projectId: body.projectId,
      entryDate: body.entryDate,
      hours: body.hours.toFixed(2),
      laborCost: laborCost.toFixed(2),
      notes: body.notes || null,
    })
    .returning();

  return c.json(entry, 201);
});

// GET /time-entries
timeEntryRoutes.get('/', authorize('worker', 'manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const role = c.get('userRole');
  const userId = c.get('userId');
  const projectId = c.req.query('projectId');

  // Workers see only their own entries
  if (role === 'worker') {
    const [worker] = await db.select().from(workers).where(eq(workers.userId, userId)).limit(1);
    if (!worker) return c.json([]);

    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.workerId, worker.id))
      .orderBy(desc(timeEntries.entryDate));
    return c.json(entries);
  }

  // Manager/Admin: filter by project if specified
  if (projectId) {
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.entryDate));
    return c.json(entries);
  }

  // All entries
  const entries = await db.select().from(timeEntries).orderBy(desc(timeEntries.entryDate));
  return c.json(entries);
});

// PATCH /time-entries/:id
timeEntryRoutes.patch('/:id', authorize('worker', 'manager', 'admin'), zValidator('json', updateTimeEntrySchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');
  const role = c.get('userRole');
  const userId = c.get('userId');

  const [existing] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Time entry not found' });
  }

  // Workers can only edit their own
  if (role === 'worker') {
    const [worker] = await db.select().from(workers).where(eq(workers.userId, userId)).limit(1);
    if (!worker || worker.id !== existing.workerId) {
      throw new HTTPException(403, { message: 'You can only edit your own time entries' });
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.projectId) updateData.projectId = body.projectId;
  if (body.entryDate) updateData.entryDate = body.entryDate;
  if (body.notes !== undefined) updateData.notes = body.notes;

  // Recompute labor cost if hours changed
  if (body.hours !== undefined) {
    updateData.hours = body.hours.toFixed(2);
    const entryDate = body.entryDate || existing.entryDate;
    const effectiveRate = await getEffectiveRate(db, existing.workerId, entryDate);
    updateData.laborCost = (body.hours * effectiveRate).toFixed(2);
  }

  const [updated] = await db.update(timeEntries).set(updateData).where(eq(timeEntries.id, id)).returning();
  return c.json(updated);
});

// DELETE /time-entries/:id
timeEntryRoutes.delete('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Time entry not found' });
  }

  await db.delete(timeEntries).where(eq(timeEntries.id, id));
  return c.json({ message: 'Time entry deleted' });
});

// ============================================================================
// HELPER: Get effective cost rate for a date
// ============================================================================

async function getEffectiveRate(db: ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>, workerId: string, entryDate: string): Promise<number> {
  const [rateRecord] = await db
    .select()
    .from(costRateHistory)
    .where(and(eq(costRateHistory.workerId, workerId), lte(costRateHistory.effectiveFrom, entryDate)))
    .orderBy(desc(costRateHistory.effectiveFrom))
    .limit(1);

  if (!rateRecord) {
    // Fallback to current worker rate
    const [worker] = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    return worker ? parseFloat(worker.costRate) : 0;
  }

  return parseFloat(rateRecord.costRate);
}
