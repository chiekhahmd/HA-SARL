/**
 * Reports Page — spend summary across all projects.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface ProjectReport {
  id: string;
  name: string;
  budget: number;
  laborCost: number;
  materialCost: number;
  actualSpend: number;
  remaining: number;
  overBudget: boolean;
}

export function ReportsPage() {
  const { config } = useTenant();
  const [report, setReport] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = config?.currency || 'TND';

  useEffect(() => {
    apiClient.get<ProjectReport[]>('/reports/projects').then(setReport).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading report...</p>;

  const totalBudget = report.reduce((sum, p) => sum + p.budget, 0);
  const totalSpend = report.reduce((sum, p) => sum + p.actualSpend, 0);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spend Report</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: 8, flex: 1 }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Total Budget</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{totalBudget.toFixed(2)} {currency}</div>
        </div>
        <div style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: 8, flex: 1 }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Total Spend</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{totalSpend.toFixed(2)} {currency}</div>
        </div>
        <div style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: 8, flex: 1 }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Remaining</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: totalSpend > totalBudget ? '#c00' : '#090' }}>
            {(totalBudget - totalSpend).toFixed(2)} {currency}
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Project</th>
            <th style={{ padding: '0.75rem' }}>Budget</th>
            <th style={{ padding: '0.75rem' }}>Labor</th>
            <th style={{ padding: '0.75rem' }}>Materials</th>
            <th style={{ padding: '0.75rem' }}>Total Spend</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {report.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{p.name}</td>
              <td style={{ padding: '0.75rem' }}>{p.budget.toFixed(2)}</td>
              <td style={{ padding: '0.75rem' }}>{p.laborCost.toFixed(2)}</td>
              <td style={{ padding: '0.75rem' }}>{p.materialCost.toFixed(2)}</td>
              <td style={{ padding: '0.75rem' }}>{p.actualSpend.toFixed(2)}</td>
              <td style={{ padding: '0.75rem' }}>
                {p.overBudget ? <span style={{ color: '#c00' }}>⚠️ Over</span> : <span style={{ color: '#090' }}>✓ OK</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
