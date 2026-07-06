/**
 * Tenant Provider — loads tenant config after auth and provides context.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { apiClient } from '../services/api-client';

interface TenantBranding {
  logo_url?: string;
  primary_color?: string;
  app_name?: string;
}

interface TenantConfig {
  tenantId: string;
  displayName: string;
  modules: string[];
  branding: TenantBranding;
  locale: string;
  currency: string;
}

interface TenantContextType {
  config: TenantConfig | null;
  isLoading: boolean;
  isModuleEnabled: (module: string) => boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadTenantConfig();
    } else {
      setConfig(null);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  async function loadTenantConfig() {
    try {
      const data = await apiClient.get<TenantConfig>('/tenant/config');
      setConfig(data);
    } catch (error) {
      console.error('Failed to load tenant config:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function isModuleEnabled(module: string): boolean {
    return config?.modules.includes(module) ?? false;
  }

  return (
    <TenantContext.Provider value={{ config, isLoading, isModuleEnabled }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
