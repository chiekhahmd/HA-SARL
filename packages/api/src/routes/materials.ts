/**
 * Material Routes — Manager/Admin only.
 *
 * POST   /materials       — Record a material purchase
 * GET    /materials       — List all materials
 * PATCH  /materials/:id   — Update material details
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createMaterialSchema, updateMaterialSchema } from '../types/schemas';
import { materials } from '../db/schema';

export const materialRoutes = new Hono();

materialRoutes.use('*', moduleGuard('materials'));

// POST /materials
materialRoutes.post('/', authorize('manager', 'admin'), zValidator('json', createMaterialSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [material] = await db
    .insert(materials)
    .values({
      name: body.name,
      quantity: body.quantity.toFixed(2),
      unit: body.unit || null,
      purchaseCost: body.purchaseCost.toFixed(2),
      purchaseDate: body.purchaseDate || null,
      supplier: body.supplier || null,
    })
    .returning();

  return c.json(material, 201);
});

// GET /materials
materialRoutes.get('/', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const allMaterials = await db.select().from(materials);
  return c.json(allMaterials);
});

// PATCH /materials/:id
materialRoutes.patch('/:id', authorize('manager', 'admin'), zValidator('json', updateMaterialSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [existing] = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Material not found' });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updateData.name = body.name;
  if (body.quantity !== undefined) updateData.quantity = body.quantity.toFixed(2);
  if (body.unit !== undefined) updateData.unit = body.unit;
  if (body.purchaseCost !== undefined) updateData.purchaseCost = body.purchaseCost.toFixed(2);
  if (body.purchaseDate !== undefined) updateData.purchaseDate = body.purchaseDate;
  if (body.supplier !== undefined) updateData.supplier = body.supplier;

  const [updated] = await db.update(materials).set(updateData).where(eq(materials.id, id)).returning();
  return c.json(updated);
});
