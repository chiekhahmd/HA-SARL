/**
 * Project Management Routes — Manager/Admin only.
 *
 * POST   /projects       — Create project with name + budget
 * GET    /projects       — List all projects with budget/spend
 * GET    /projects/:id   — Get single project with detailed spend breakdown
 * PATCH  /projects/:id   — Update project name or budget
 * DELETE /projects/:id   — Delete project (only if no cost records)
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createProjectSchema, updateProjectSchema } from '../types/schemas';
import { projects, timeEntries, materialAllocations } from '../db/schema';

export const projectRoutes = new Hono();

// All project routes require the 'projects' module to be enabled
projectRoutes.use('*', moduleGuard('projects'));

// POST /projects — Create a new project
projectRoutes.post('/', authorize('manager', 'admin'), zValidator('json', createProjectSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  const [project] = await db
    .insert(projects)
    .values({
      name: body.name,
      budget: body.budget.toFixed(2),
      description: body.description || null,
    })
    .returning();

  return c.json(project, 201);
});

// GET /projects — List all projects with budget and actual spend
projectRoutes.get('/', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');

  // Get all active projects
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      budget: projects.budget,
      description: projects.description,
      isActive: projects.isActive,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.isActive, true));

  // For each project, compute actual spend
  const projectsWithSpend = await Promise.all(
    allProjects.map(async (project) => {
      const spend = await computeProjectSpend(db, project.id);
      const budget = parseFloat(project.budget);
      return {
        ...project,
        budget,
        actualSpend: spend.total,
        laborCost: spend.laborCost,
        materialCost: spend.materialCost,
        remaining: budget - spend.total,
        overBudget: spend.total > budget,
      };
    }),
  );

  return c.json(projectsWithSpend);
});

// GET /projects/:id — Get single project with detailed breakdown
projectRoutes.get('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) {
    throw new HTTPException(404, { message: 'Project not found' });
  }

  const spend = await computeProjectSpend(db, id);
  const budget = parseFloat(project.budget);

  return c.json({
    ...project,
    budget,
    actualSpend: spend.total,
    laborCost: spend.laborCost,
    materialCost: spend.materialCost,
    remaining: budget - spend.total,
    overBudget: spend.total > budget,
  });
});

// PATCH /projects/:id — Update project
projectRoutes.patch('/:id', authorize('manager', 'admin'), zValidator('json', updateProjectSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');

  // Check exists
  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Project not found' });
  }

  // Build update
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updateData.name = body.name;
  if (body.budget !== undefined) updateData.budget = body.budget.toFixed(2);
  if (body.description !== undefined) updateData.description = body.description;

  const [updated] = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, id))
    .returning();

  return c.json(updated);
});

// DELETE /projects/:id — Delete project (only if no cost records)
projectRoutes.delete('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  // Check exists
  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: 'Project not found' });
  }

  // Check for associated time entries
  const [timeEntryCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, id));

  if (timeEntryCount.count > 0) {
    throw new HTTPException(409, {
      message: 'Cannot delete project with associated time entries. Remove time entries first.',
    });
  }

  // Check for associated material allocations
  const [allocationCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(materialAllocations)
    .where(eq(materialAllocations.projectId, id));

  if (allocationCount.count > 0) {
    throw new HTTPException(409, {
      message: 'Cannot delete project with associated material allocations. Remove allocations first.',
    });
  }

  // Safe to delete
  await db.delete(projects).where(eq(projects.id, id));

  return c.json({ message: 'Project deleted' });
});

// ============================================================================
// HELPER: Compute project actual spend
// ============================================================================

async function computeProjectSpend(db: ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>, projectId: string) {
  // Sum labor cost from time entries
  const [laborResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(labor_cost), 0)` })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, projectId));

  // Sum material allocated cost
  const [materialResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(allocated_cost), 0)` })
    .from(materialAllocations)
    .where(eq(materialAllocations.projectId, projectId));

  const laborCost = parseFloat(laborResult.total);
  const materialCost = parseFloat(materialResult.total);

  return {
    laborCost,
    materialCost,
    total: laborCost + materialCost,
  };
}
