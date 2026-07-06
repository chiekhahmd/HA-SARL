/**
 * Material Allocation Routes — Manager/Admin only.
 *
 * POST   /material-allocations       — Allocate material to project
 * GET    /material-allocations       — List (filter by projectId)
 * DELETE /material-allocations/:id   — Remove allocation
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createMaterialAllocationSchema } from '../types/schemas';
import { materialAllocations, materials, projects } from '../db/schema';

export const materialAllocationRoutes = new Hono();

materialAllocationRoutes.use('*', moduleGuard('materials'));

// POST /material-allocations
materialAllocationRoutes.post('/', authorize('manager', 'admin'), zValidator('json', createMaterialAllocationSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  // Verify material exists
  const [material] = await db.select().from(materials).where(eq(materials.id, body.materialId)).limit(1);
  if (!material) {
    throw new HTTPException(404, { message: 'Material not found' });
  }

  // Verify project exists
  const [project] = await db.select().from(projects).where(eq(projects.id, body.projectId)).limit(1);
  if (!project) {
    throw new HTTPException(404, { message: 'Project not found' });
  }

  // Check unallocated quantity
  const [allocated] = await db
    .select({ total: sql<string>`COALESCE(SUM(allocated_quantity), 0)` })
    .from(materialAllocations)
    .where(eq(materialAllocations.materialId, body.materialId));

  const totalAllocated = parseFloat(allocated.total);
  const materialQty = parseFloat(material.quantity);
  const unallocated = materialQty - totalAllocated;

  if (body.allocatedQuantity > unallocated) {
    throw new HTTPException(400, {
      message: `Insufficient unallocated quantity. Available: ${unallocated.toFixed(2)}, Requested: ${body.allocatedQuantity}`,
    });
  }

  const [allocation] = await db
    .insert(materialAllocations)
    .values({
      materialId: body.materialId,
      projectId: body.projectId,
      allocatedQuantity: body.allocatedQuantity.toFixed(2),
      allocatedCost: body.allocatedCost.toFixed(2),
    })
    .returning();

  return c.json(allocation, 201);
});

// GET /material-allocations
materialAllocationRoutes.get('/', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const projectId = c.req.query('projectId');

  if (projectId) {
    const allocations = await db
      .select()
      .from(materialAllocations)
      .where(eq(materialAllocations.projectId, projectId));
    return c.json(allocations);
  }

  const allocations = await db.select().from(materialAllocations);
  return c.json(allocations);
});

// DELETE /material-allocations/:id
materialAllocationRoutes.delete('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(materialAllocations).where(eq(materialAllocations.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Material allocation not found' });
  }

  await db.delete(materialAllocations).where(eq(materialAllocations.id, id));
  return c.json({ message: 'Allocation removed' });
});
