/**
 * Reports Routes — Manager/Admin only.
 *
 * GET /reports/projects       — All projects spend summary
 * GET /reports/projects/:id   — Single project detailed breakdown
 */
import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { projects, timeEntries, materialAllocations } from '../db/schema';

export const reportRoutes = new Hono();

reportRoutes.use('*', moduleGuard('reports'));

// GET /reports/projects — All projects summary
reportRoutes.get('/projects', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');

  const allProjects = await db.select().from(projects).where(eq(projects.isActive, true));

  const report = await Promise.all(
    allProjects.map(async (project) => {
      const [laborResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(labor_cost), 0)` })
        .from(timeEntries)
        .where(eq(timeEntries.projectId, project.id));

      const [materialResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(allocated_cost), 0)` })
        .from(materialAllocations)
        .where(eq(materialAllocations.projectId, project.id));

      const laborCost = parseFloat(laborResult.total);
      const materialCost = parseFloat(materialResult.total);
      const actualSpend = laborCost + materialCost;
      const budget = parseFloat(project.budget);

      return {
        id: project.id,
        name: project.name,
        budget,
        laborCost,
        materialCost,
        actualSpend,
        remaining: budget - actualSpend,
        overBudget: actualSpend > budget,
      };
    }),
  );

  return c.json(report);
});

// GET /reports/projects/:id — Single project detail
reportRoutes.get('/projects/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) {
    throw new HTTPException(404, { message: 'Project not found' });
  }

  const [laborResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(labor_cost), 0)` })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, id));

  const [materialResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(allocated_cost), 0)` })
    .from(materialAllocations)
    .where(eq(materialAllocations.projectId, id));

  const laborCost = parseFloat(laborResult.total);
  const materialCost = parseFloat(materialResult.total);
  const actualSpend = laborCost + materialCost;
  const budget = parseFloat(project.budget);

  return c.json({
    id: project.id,
    name: project.name,
    description: project.description,
    budget,
    laborCost,
    materialCost,
    actualSpend,
    remaining: budget - actualSpend,
    overBudget: actualSpend > budget,
  });
});
