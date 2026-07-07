/**
 * Materials Page — list + create form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface Material {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  purchaseCost: string;
  supplier: string | null;
}

export function MaterialsPage() {
  const { config } = useTenant();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currency = config?.currency || 'TND';

  useEffect(() => { load(); }, []);

  async function load() {
    try { setMaterials(await apiClient.get<Material[]>('/materials')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/materials', {
        name: formName,
        quantity: parseFloat(formQty),
        unit: formUnit || undefined,
        purchaseCost: parseFloat(formCost),
        supplier: formSupplier || undefined,
      });
      setShowForm(false); setFormName(''); setFormQty(''); setFormUnit(''); setFormCost(''); setFormSupplier('');
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <p>Loading materials...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Materials</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ New Material'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Quantity *</label>
              <input type="number" min="0.01" step="0.01" value={formQty} onChange={(e) => setFormQty(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Unit</label>
              <input value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="kg, unit, m..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Purchase Cost ({currency}) *</label>
              <input type="number" min="0" step="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Supplier</label>
              <input value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Creating...' : 'Create Material'}
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Name</th>
            <th style={{ padding: '0.75rem' }}>Quantity</th>
            <th style={{ padding: '0.75rem' }}>Cost</th>
            <th style={{ padding: '0.75rem' }}>Supplier</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{m.name}</td>
              <td style={{ padding: '0.75rem' }}>{parseFloat(m.quantity)} {m.unit || ''}</td>
              <td style={{ padding: '0.75rem' }}>{parseFloat(m.purchaseCost).toFixed(2)} {currency}</td>
              <td style={{ padding: '0.75rem', color: '#666' }}>{m.supplier || '—'}</td>
            </tr>
          ))}
          {materials.length === 0 && (
            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No materials yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
