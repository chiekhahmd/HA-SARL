/**
 * Vehicles Page — list + create form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';

interface InsurancePeriod { endDate: string; insurer: string | null; }
interface Vehicle { id: string; identifier: string; description: string | null; currentInsurancePeriod: InsurancePeriod | null; }

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formId, setFormId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setVehicles(await apiClient.get<Vehicle[]>('/vehicles')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/vehicles', { identifier: formId, description: formDesc || undefined });
      setShowForm(false); setFormId(''); setFormDesc('');
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  function getInsuranceStatus(period: InsurancePeriod | null) {
    if (!period) return <span style={{ color: '#888' }}>No insurance</span>;
    const daysLeft = Math.ceil((new Date(period.endDate).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) return <span style={{ color: '#c00' }}>⚠️ Expired</span>;
    if (daysLeft < 30) return <span style={{ color: '#f80' }}>⏳ Expires in {daysLeft}d</span>;
    return <span style={{ color: '#090' }}>✓ Valid until {period.endDate}</span>;
  }

  if (loading) return <p>Loading vehicles...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Vehicles</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ New Vehicle'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Identifier (plate) *</label>
              <input value={formId} onChange={(e) => setFormId(e.target.value)} required placeholder="e.g. 123-TUN-456" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Description</label>
              <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="e.g. White Peugeot Partner" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Creating...' : 'Create Vehicle'}
          </button>
        </form>
      )}

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
