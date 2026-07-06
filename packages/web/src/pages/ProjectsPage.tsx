/**
 * Projects Page — list all projects with budget/spend.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface Project {
  id: string;
  name: string;
  budget: number;
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

  const currency = config?.currency || 'TND';

  useEffect(() => {
    loadProjects();
  }, []);

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

  if (loading) return <p>Loading projects...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Projects</h1>
      </div>

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
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                No projects yet. Create your first project.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
