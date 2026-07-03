/**
 * Seed script — populates a new tenant database with default data.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/dbname npx tsx src/db/seed.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './schema';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL must be set');
    process.exit(1);
  }

  console.log(`Seeding database: ${databaseUrl.replace(/\/\/[^@]+@/, '//***@')}`);

  const connection = postgres(databaseUrl, { max: 1 });
  const db = drizzle(connection);

  try {
    // Check if already seeded (admin user exists)
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('⚠️  Database already has data, skipping seed');
      return;
    }

    // Note: The actual admin user will be created via Cognito + the API
    // This seed is a placeholder for any system-level default data
    console.log('✅ Seed completed (no default data to insert for a fresh tenant)');
    console.log('   → Create the first admin user via Cognito and the /users API');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
