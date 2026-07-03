/**
 * Migration runner — runs all pending migrations against a specific database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/dbname npx tsx src/db/migrate.ts
 *
 * Or with individual env vars:
 *   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... npx tsx src/db/migrate.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';

async function runMigrations() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}`;

  if (!databaseUrl || databaseUrl.includes('undefined')) {
    console.error('Error: DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME must be set');
    process.exit(1);
  }

  console.log(`Running migrations against: ${databaseUrl.replace(/\/\/[^@]+@/, '//***@')}`);

  const connection = postgres(databaseUrl, { max: 1 });
  const db = drizzle(connection);

  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, 'migrations'),
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
