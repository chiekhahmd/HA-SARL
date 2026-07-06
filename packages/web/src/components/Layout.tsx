/**
 * App Shell Layout — sidebar navigation + header + content area.
 */
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useTenant } from '../tenant/TenantProvider';

const NAV_ITEMS = [
  { path: '/projects', label: '📊 Projects', module: 'projects', roles: ['admin', 'manager'] },
  { path: '/workers', label: '👷 Workers', module: 'workers', roles: ['admin', 'manager'] },
  { path: '/time-entries', label: '⏱️ Time', module: 'time-tracking', roles: ['admin', 'manager', 'worker'] },
  { path: '/absences', label: '🏖️ Absences', module: 'absences', roles: ['admin', 'manager', 'worker'] },
  { path: '/materials', label: '📦 Materials', module: 'materials', roles: ['admin', 'manager'] },
  { path: '/vehicles', label: '🚗 Vehicles', module: 'vehicles', roles: ['admin', 'manager'] },
  { path: '/reports', label: '📈 Reports', module: 'reports', roles: ['admin', 'manager'] },
  { path: '/users', label: '👥 Users', module: null, roles: ['admin'] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { config, isModuleEnabled } = useTenant();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter((item) => {
    // Check role
    if (!user || !item.roles.includes(user.role)) return false;
    // Check module (null = always visible for matching role)
    if (item.module && !isModuleEnabled(item.module)) return false;
    return true;
  });

  const appName = config?.branding.app_name || 'Society ERP';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: '#1a1a2e',
          color: '#fff',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>{appName}</h2>
        <nav style={{ flex: 1 }}>
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'block',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: 4,
                color: location.pathname === item.path ? '#fff' : '#aaa',
                background: location.pathname === item.path ? '#16213e' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', fontSize: '0.85rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>{user?.email}</div>
          <div style={{ marginBottom: '0.5rem', opacity: 0.7 }}>Role: {user?.role}</div>
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: '1px solid #555',
              color: '#aaa',
              padding: '0.3rem 0.75rem',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', background: '#f5f5f5' }}>{children}</main>
    </div>
  );
}
