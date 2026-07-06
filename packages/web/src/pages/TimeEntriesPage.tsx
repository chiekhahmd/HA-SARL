/**
 * Time Entries Page — list time entries.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface TimeEntry {
  id: string;
  workerId: string;
  projectId: string;
  entryDate: string;
  hours: string;
  laborCost: string;
  notes: string | null;
}

export function TimeEntriesPage() {
  const { config } = useTenant();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = config?.currency || 'TND';

  useEffect(() => {
    apiClient.get<TimeEntry[]>('/time-entries').then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading time entries...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Time Entries</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Date</th>
            <th style={{ padding: '0.75rem' }}>Hours</th>
            <th style={{ padding: '0.75rem' }}>Labor Cost</th>
            <th style={{ padding: '0.75rem' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{e.entryDate}</td>
              <td style={{ padding: '0.75rem' }}>{parseFloat(e.hours).toFixed(1)}h</td>
              <td style={{ padding: '0.75rem' }}>{parseFloat(e.laborCost).toFixed(2)} {currency}</td>
              <td style={{ padding: '0.75rem', color: '#666' }}>{e.notes || '—'}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No time entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
