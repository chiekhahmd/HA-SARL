/**
 * Tenant-aware DB connection manager.
 *
 * Maintains one connection pool per tenant database.
 * Pools are reused across requests within the same Lambda container (warm invocations).
 * Credentials are fetched from Secrets Manager and cached.
 */
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

import * as schema from './schema';

export type TenantDb = PostgresJsDatabase<typeof schema>;

interface DbCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
}

class TenantDbManager {
  private pools: Map<string, postgres.Sql> = new Map();
  private drizzleInstances: Map<string, TenantDb> = new Map();
  private credentials: DbCredentials | null = null;
  private secretsClient: SecretsManagerClient;

  constructor() {
    this.secretsClient = new SecretsManagerClient({
      region: process.env.COGNITO_REGION || 'eu-west-3',
    });
  }

  /**
   * Fetch DB credentials from Secrets Manager (cached after first call).
   */
  private async getCredentials(): Promise<DbCredentials> {
    if (this.credentials) {
      return this.credentials;
    }

    const secretArn = process.env.DB_SECRET_ARN;

    if (!secretArn) {
      // Fallback for local development
      this.credentials = {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
      };
      return this.credentials;
    }

    const result = await this.secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );

    if (!result.SecretString) {
      throw new Error('DB secret is empty');
    }

    const secret = JSON.parse(result.SecretString);
    this.credentials = {
      username: secret.username,
      password: secret.password,
      host: secret.host || process.env.DB_HOST || 'localhost',
      port: secret.port || parseInt(process.env.DB_PORT || '5432', 10),
    };

    return this.credentials;
  }

  /**
   * Get a Drizzle ORM instance connected to a specific tenant's database.
   */
  async getConnection(dbName: string): Promise<TenantDb> {
    // Return cached instance if available
    const existing = this.drizzleInstances.get(dbName);
    if (existing) {
      return existing;
    }

    const creds = await this.getCredentials();

    // Create a new connection pool for this tenant
    const sql = postgres({
      host: creds.host,
      port: creds.port,
      user: creds.username,
      password: creds.password,
      database: dbName,
      max: 3, // Small pool per tenant (Lambda has limited concurrent connections)
      idle_timeout: 60, // Close idle connections after 60s
      connect_timeout: 10,
    });

    const db = drizzle(sql, { schema });

    // Cache for reuse
    this.pools.set(dbName, sql);
    this.drizzleInstances.set(dbName, db);

    return db;
  }

  /**
   * Close all connection pools (useful for graceful shutdown in tests).
   */
  async closeAll(): Promise<void> {
    for (const [name, sql] of this.pools) {
      await sql.end();
      this.pools.delete(name);
      this.drizzleInstances.delete(name);
    }
  }
}

// Singleton — reused across Lambda invocations in the same container
export const tenantDbManager = new TenantDbManager();
