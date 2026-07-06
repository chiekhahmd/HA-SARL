/**
 * Worker Management Routes — Manager/Admin only.
 *
 * POST   /workers       — Create worker with name + cost rate
 * GET    /workers       — List all workers
 * GET    /workers/:id   — Get worker details with rate history
 * PATCH  /workers/:id   — Update name or cost rate (inserts rate history)
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createWorkerSchema, updateWorkerSchema } from '../types/schemas';
import { workers, costRateHistory } from '../db/schema';

export const workerRoutes = new Hono();

workerRoutes.use('*', moduleGuard('workers'));

// POST /workers
workerRoutes.post('/', authorize('manager', 'admin'), zValidator('json', createWorkerSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [worker] = await db
    .insert(workers)
    .values({
      name: body.name,
      costRate: body.costRate.toFixed(2),
      userId: body.userId || null,
    })
    .returning();

  // Insert initial cost rate history
  await db.insert(costRateHistory).values({
    workerId: worker.id,
    costRate: body.costRate.toFixed(2),
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  return c.json(worker, 201);
});

// GET /workers
workerRoutes.get('/', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const allWorkers = await db.select().from(workers);
  return c.json(allWorkers);
});

// GET /workers/:id
workerRoutes.get('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [worker] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  if (!worker) {
    throw new HTTPException(404, { message: 'Worker not found' });
  }

  // Get rate history
  const rateHistory = await db
    .select()
    .from(costRateHistory)
    .where(eq(costRateHistory.workerId, id))
    .orderBy(desc(costRateHistory.effectiveFrom));

  return c.json({ ...worker, rateHistory });
});

// PATCH /workers/:id
workerRoutes.patch('/:id', authorize('manager', 'admin'), zValidator('json', updateWorkerSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Worker not found' });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updateData.name = body.name;

  // If cost rate changed, insert new history record
  if (body.costRate !== undefined && body.costRate.toFixed(2) !== existing.costRate) {
    updateData.costRate = body.costRate.toFixed(2);
    await db.insert(costRateHistory).values({
      workerId: id,
      costRate: body.costRate.toFixed(2),
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
  }

  const [updated] = await db.update(workers).set(updateData).where(eq(workers.id, id)).returning();
  return c.json(updated);
});
