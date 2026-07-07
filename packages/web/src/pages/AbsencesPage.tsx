/**
 * Absences Page — list + create form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';

interface Absence { id: string; startDate: string; endDate: string; absenceType: string; notes: string | null; }

const ABSENCE_TYPES = ['vacation', 'sick', 'personal', 'other'];

export function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formType, setFormType] = useState('vacation');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setAbsences(await apiClient.get<Absence[]>('/absences')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (formEnd < formStart) { setFormError('End date must be on or after start date'); return; }
    setSubmitting(true);
    try {
      await apiClient.post('/absences', {
        startDate: formStart, endDate: formEnd, absenceType: formType, notes: formNotes || undefined,
      });
      setShowForm(false); setFormStart(''); setFormEnd(''); setFormNotes('');
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <p>Loading absences...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Absences</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ Record Absence'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Type *</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}>
                {ABSENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>From *</label>
              <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>To *</label>
              <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Notes</label>
            <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Recording...' : 'Record Absence'}
          </button>
        </form>
      )}

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
