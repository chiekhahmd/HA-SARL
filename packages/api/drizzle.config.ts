import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // These are only used for drizzle-kit push/pull (direct DB access)
    // For migration generation, no connection is needed
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/hasarl_db',
  },
});
