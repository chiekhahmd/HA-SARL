/**
 * Time Entries Page — list + create form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';
import { useTenant } from '../tenant/TenantProvider';

interface TimeEntry { id: string; entryDate: string; hours: string; laborCost: string; notes: string | null; }
interface Project { id: string; name: string; }

export function TimeEntriesPage() {
  const { config } = useTenant();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProject, setFormProject] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formHours, setFormHours] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currency = config?.currency || 'TND';

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [e, p] = await Promise.all([
        apiClient.get<TimeEntry[]>('/time-entries'),
        apiClient.get<Project[]>('/projects'),
      ]);
      setEntries(e); setProjects(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/time-entries', {
        projectId: formProject,
        entryDate: formDate,
        hours: parseFloat(formHours),
        notes: formNotes || undefined,
      });
      setShowForm(false); setFormHours(''); setFormNotes('');
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <p>Loading time entries...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Time Entries</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ Log Time'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Project *</label>
              <select value={formProject} onChange={(e) => setFormProject(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}>
                <option value="">Select project...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Date *</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Hours *</label>
              <input type="number" min="0.25" max="24" step="0.25" value={formHours} onChange={(e) => setFormHours(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Notes</label>
            <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Logging...' : 'Log Time'}
          </button>
        </form>
      )}

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
