import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

// Health check (public — no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

// TODO: Global middleware (auth, tenant resolver) will be added in Tasks 5-6
// TODO: Route modules will be mounted in Tasks 8-19

export const handler = handle(app);
export { app };
