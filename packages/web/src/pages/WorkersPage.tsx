/**
 * Workers Page — list all workers with cost rate.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface Worker {
  id: string;
  name: string;
  costRate: string;
  createdAt: string;
}

export function WorkersPage() {
  const { config } = useTenant();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = config?.currency || 'TND';

  useEffect(() => {
    apiClient.get<Worker[]>('/workers').then(setWorkers).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading workers...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Workers</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Name</th>
            <th style={{ padding: '0.75rem' }}>Cost Rate (/hr)</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{w.name}</td>
              <td style={{ padding: '0.75rem' }}>{parseFloat(w.costRate).toFixed(2)} {currency}</td>
            </tr>
          ))}
          {workers.length === 0 && (
            <tr><td colSpan={2} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No workers yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
