/**
 * Local development server.
 * Runs the Hono app as a regular Node.js HTTP server.
 *
 * Usage: npm run dev (from packages/api)
 *
 * Note: Auth middleware will fail without a real Cognito token.
 * For local dev, use the /health endpoint or set SKIP_AUTH=true.
 */
import { serve } from '@hono/node-server';
import { app } from './index';

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`🚀 Society ERP API running at http://localhost:${port}`);
console.log(`   Health check: http://localhost:${port}/health`);
serve({ fetch: app.fetch, port });
