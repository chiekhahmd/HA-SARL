/**
 * Vehicles Page — list vehicles with insurance status.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';

interface InsurancePeriod {
  endDate: string;
  insurer: string | null;
}

interface Vehicle {
  id: string;
  identifier: string;
  description: string | null;
  currentInsurancePeriod: InsurancePeriod | null;
}

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<Vehicle[]>('/vehicles').then(setVehicles).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading vehicles...</p>;

  function getInsuranceStatus(period: InsurancePeriod | null) {
    if (!period) return <span style={{ color: '#888' }}>No insurance</span>;
    const endDate = new Date(period.endDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return <span style={{ color: '#c00' }}>⚠️ Expired</span>;
    if (daysLeft < 30) return <span style={{ color: '#f80' }}>⏳ Expires in {daysLeft} days</span>;
    return <span style={{ color: '#090' }}>✓ Valid until {period.endDate}</span>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Vehicles</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Identifier</th>
            <th style={{ padding: '0.75rem' }}>Description</th>
            <th style={{ padding: '0.75rem' }}>Insurance Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{v.identifier}</td>
              <td style={{ padding: '0.75rem', color: '#666' }}>{v.description || '—'}</td>
              <td style={{ padding: '0.75rem' }}>{getInsuranceStatus(v.currentInsurancePeriod)}</td>
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No vehicles yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
