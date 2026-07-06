/**
 * User Management Routes — Admin only.
 *
 * POST   /users       — Create user (Cognito + local DB)
 * GET    /users       — List all users for this tenant
 * PATCH  /users/:id   — Update user role or status
 * DELETE /users/:id   — Deactivate user
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { authorize } from '../middleware/auth';
import { createUserSchema, updateUserSchema } from '../types/schemas';
import { users } from '../db/schema';
import { createCognitoUser, disableCognitoUser, updateCognitoUserRole } from '../services/cognito-service';

export const userRoutes = new Hono();

// All user management routes require admin role
userRoutes.use('*', authorize('admin'));

// POST /users — Create a new user
userRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('tenantDb');
  const tenantId = c.get('tenantId');

  // Check if email already exists in this tenant's DB
  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) {
    throw new HTTPException(409, { message: `User with email '${body.email}' already exists` });
  }

  // Create user in Cognito
  const cognitoSub = await createCognitoUser({
    email: body.email,
    name: body.name,
    role: body.role,
    tenantId,
  });

  // Create local DB record
  const [newUser] = await db
    .insert(users)
    .values({
      cognitoSub,
      email: body.email,
      name: body.name,
      role: body.role,
      isActive: true,
    })
    .returning();

  return c.json(newUser, 201);
});

// GET /users — List all users
userRoutes.get('/', async (c) => {
  const db = c.get('tenantDb');

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users);

  return c.json(allUsers);
});

// PATCH /users/:id — Update user role or active status
userRoutes.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = c.get('tenantDb');
  const tenantId = c.get('tenantId');

  // Find user
  const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existingUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  // Update role in Cognito if changed
  if (body.role && body.role !== existingUser.role) {
    await updateCognitoUserRole(existingUser.cognitoSub, body.role, tenantId);
  }

  // Build update object
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.role) updateData.role = body.role;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  // Update local DB
  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();

  return c.json(updated);
});

// DELETE /users/:id — Deactivate user (soft delete)
userRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');

  // Find user
  const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existingUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  // Disable in Cognito
  await disableCognitoUser(existingUser.cognitoSub);

  // Mark inactive in DB
  const [deactivated] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return c.json(deactivated);
});
