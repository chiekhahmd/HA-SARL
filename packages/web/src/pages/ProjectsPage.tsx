/**
 * Projects Page — list + create/edit form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface Project {
  id: string;
  name: string;
  budget: number;
  description?: string;
  actualSpend: number;
  laborCost: number;
  materialCost: number;
  remaining: number;
  overBudget: boolean;
}

export function ProjectsPage() {
  const { config } = useTenant();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currency = config?.currency || 'TND';

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const data = await apiClient.get<Project[]>('/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/projects', {
        name: formName,
        budget: parseFloat(formBudget),
        description: formDesc || undefined,
      });
      setShowForm(false);
      setFormName('');
      setFormBudget('');
      setFormDesc('');
      await loadProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading projects...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Projects</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Project Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Budget ({currency}) *</label>
              <input type="number" min="0" step="0.01" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Description</label>
            <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Name</th>
            <th style={{ padding: '0.75rem' }}>Budget</th>
            <th style={{ padding: '0.75rem' }}>Spent</th>
            <th style={{ padding: '0.75rem' }}>Remaining</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{project.name}</td>
              <td style={{ padding: '0.75rem' }}>{project.budget.toFixed(2)} {currency}</td>
              <td style={{ padding: '0.75rem' }}>{project.actualSpend.toFixed(2)} {currency}</td>
              <td style={{ padding: '0.75rem' }}>{project.remaining.toFixed(2)} {currency}</td>
              <td style={{ padding: '0.75rem' }}>
                {project.overBudget ? (
                  <span style={{ color: '#c00', fontWeight: 600 }}>⚠️ Over budget</span>
                ) : (
                  <span style={{ color: '#090' }}>✓ On track</span>
                )}
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No projects yet. Create your first project.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
