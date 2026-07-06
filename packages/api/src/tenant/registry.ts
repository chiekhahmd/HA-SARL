/**
 * Tenant Registry — reads tenant configuration from DynamoDB with in-memory caching.
 *
 * Each tenant entry contains: tenant_id, db_name, display_name, custom_domain,
 * config (modules, branding, locale, currency, alert_lead_time_days), is_active.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export interface TenantBranding {
  logo_url?: string;
  primary_color?: string;
  app_name?: string;
}

export interface TenantConfig {
  modules: string[];
  branding: TenantBranding;
  locale: string;
  currency: string;
  alert_lead_time_days: number;
}

export interface TenantRecord {
  tenant_id: string;
  db_name: string;
  display_name: string;
  custom_domain?: string;
  config: TenantConfig;
  is_active: boolean;
  created_at: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  tenant: TenantRecord;
  cachedAt: number;
}

class TenantRegistry {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private cache: Map<string, CacheEntry> = new Map();

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.COGNITO_REGION || 'eu-west-3',
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.TENANT_TABLE_NAME || 'society-erp-tenants';
  }

  /**
   * Get tenant config by tenant_id. Returns from cache if fresh, otherwise fetches from DynamoDB.
   */
  async get(tenantId: string): Promise<TenantRecord | null> {
    // Check cache
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.tenant;
    }

    // Fetch from DynamoDB
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { tenant_id: tenantId },
      }),
    );

    if (!result.Item) {
      return null;
    }

    const tenant = result.Item as TenantRecord;

    // Cache it
    this.cache.set(tenantId, { tenant, cachedAt: Date.now() });

    return tenant;
  }

  /**
   * Check if a specific module is enabled for a tenant.
   */
  isModuleEnabled(tenant: TenantRecord, moduleName: string): boolean {
    return tenant.config.modules.includes(moduleName);
  }

  /**
   * Invalidate cache for a specific tenant (useful after config updates).
   */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /**
   * Clear entire cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance (reused across Lambda invocations within the same container)
export const tenantRegistry = new TenantRegistry();
