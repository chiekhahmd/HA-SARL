/**
 * Dashboard — landing page after login, shows summary.
 */
import { useTenant } from '../tenant/TenantProvider';
import { useAuth } from '../auth/AuthProvider';

export function DashboardPage() {
  const { user } = useAuth();
  const { config } = useTenant();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Welcome, {user?.email}
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        {config?.displayName} — {config?.currency} • Role: {user?.role}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <InfoCard title="Your Role" value={user?.role || ''} />
        <InfoCard title="Modules" value={`${config?.modules.length || 0} active`} />
        <InfoCard title="Locale" value={config?.locale || ''} />
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
