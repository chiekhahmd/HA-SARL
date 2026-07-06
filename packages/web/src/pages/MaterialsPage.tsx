/**
 * Materials Page — list materials.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface Material {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  purchaseCost: string;
  supplier: string | null;
  purchaseDate: string | null;
}

export function MaterialsPage() {
  const { config } = useTenant();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = config?.currency || 'TND';

  useEffect(() => {
    apiClient.get<Material[]>('/materials').then(setMaterials).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading materials...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Materials</h1>
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
