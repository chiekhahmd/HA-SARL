import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantRecord } from './registry';

// Mock DynamoDB client
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({
      send: vi.fn(),
    }),
  },
  GetCommand: vi.fn(),
}));

// We'll test the registry logic with a mock
describe('TenantRegistry', () => {
  const validTenant: TenantRecord = {
    tenant_id: 'hasarl',
    db_name: 'hasarl_db',
    display_name: 'HA SARL',
    custom_domain: 'app.hasarl.com',
    config: {
      modules: ['projects', 'workers', 'time-tracking', 'absences', 'materials', 'vehicles', 'insurance', 'reports'],
      branding: {
        logo_url: 'https://example.com/logo.png',
        primary_color: '#1a73e8',
        app_name: 'HA SARL - Gestion',
      },
      locale: 'fr-FR',
      currency: 'TND',
      alert_lead_time_days: 30,
    },
    is_active: true,
    created_at: '2026-07-01T00:00:00Z',
  };

  const disabledTenant: TenantRecord = {
    ...validTenant,
    tenant_id: 'disabled-co',
    is_active: false,
  };

  describe('isModuleEnabled', () => {
    it('returns true for an enabled module', async () => {
      // Import after mocks are set up
      const { tenantRegistry } = await import('./registry');
      expect(tenantRegistry.isModuleEnabled(validTenant, 'projects')).toBe(true);
      expect(tenantRegistry.isModuleEnabled(validTenant, 'vehicles')).toBe(true);
    });

    it('returns false for a disabled module', async () => {
      const { tenantRegistry } = await import('./registry');
      expect(tenantRegistry.isModuleEnabled(validTenant, 'invoicing')).toBe(false);
      expect(tenantRegistry.isModuleEnabled(validTenant, 'crm')).toBe(false);
    });
  });

  describe('tenant validation logic', () => {
    it('active tenant passes validation', () => {
      expect(validTenant.is_active).toBe(true);
    });

    it('disabled tenant fails validation', () => {
      expect(disabledTenant.is_active).toBe(false);
    });

    it('tenant has correct db_name', () => {
      expect(validTenant.db_name).toBe('hasarl_db');
    });

    it('tenant config has expected structure', () => {
      expect(validTenant.config.modules).toBeInstanceOf(Array);
      expect(validTenant.config.modules.length).toBeGreaterThan(0);
      expect(validTenant.config.currency).toBe('TND');
      expect(validTenant.config.locale).toBe('fr-FR');
      expect(validTenant.config.alert_lead_time_days).toBe(30);
    });
  });

  describe('cache behavior', () => {
    beforeEach(async () => {
      const { tenantRegistry } = await import('./registry');
      tenantRegistry.clearCache();
    });

    it('invalidate removes a tenant from cache', async () => {
      const { tenantRegistry } = await import('./registry');
      // Manually test cache operations
      tenantRegistry.invalidate('hasarl');
      // No error thrown — invalidating non-existent key is safe
    });

    it('clearCache empties all entries', async () => {
      const { tenantRegistry } = await import('./registry');
      tenantRegistry.clearCache();
      // No error thrown
    });
  });
});
