/**
 * Absences Page — list absences.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';

interface Absence {
  id: string;
  workerId: string;
  startDate: string;
  endDate: string;
  absenceType: string;
  notes: string | null;
}

export function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<Absence[]>('/absences').then(setAbsences).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading absences...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Absences</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Type</th>
            <th style={{ padding: '0.75rem' }}>From</th>
            <th style={{ padding: '0.75rem' }}>To</th>
            <th style={{ padding: '0.75rem' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {absences.map((a) => (
            <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{a.absenceType}</td>
              <td style={{ padding: '0.75rem' }}>{a.startDate}</td>
              <td style={{ padding: '0.75rem' }}>{a.endDate}</td>
              <td style={{ padding: '0.75rem', color: '#666' }}>{a.notes || '—'}</td>
            </tr>
          ))}
          {absences.length === 0 && (
            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No absences recorded.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
