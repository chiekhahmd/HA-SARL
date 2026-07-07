/**
 * Workers Page — list + create form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface Worker {
  id: string;
  name: string;
  costRate: string;
}

export function WorkersPage() {
  const { config } = useTenant();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currency = config?.currency || 'TND';

  useEffect(() => { load(); }, []);

  async function load() {
    try { setWorkers(await apiClient.get<Worker[]>('/workers')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/workers', { name: formName, costRate: parseFloat(formRate) });
      setShowForm(false); setFormName(''); setFormRate('');
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <p>Loading workers...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Workers</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ New Worker'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Worker Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Cost Rate ({currency}/hr) *</label>
              <input type="number" min="0" step="0.01" value={formRate} onChange={(e) => setFormRate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Creating...' : 'Create Worker'}
          </button>
        </form>
      )}

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
