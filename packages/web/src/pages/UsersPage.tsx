/**
 * Users Page — Admin only, list + invite form.
 */
import { useEffect, useState, FormEvent } from 'react';
import { apiClient } from '../services/api-client';

interface User { id: string; email: string; name: string; role: string; isActive: boolean; }

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('worker');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setUsers(await apiClient.get<User[]>('/users')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await apiClient.post('/users', { email: formEmail, name: formName, role: formRole });
      setShowForm(false); setFormEmail(''); setFormName(''); setFormRole('worker');
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this user?')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      await load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
  }

  if (loading) return <p>Loading users...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>User Management</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {showForm ? 'Cancel' : '+ Invite User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, marginBottom: '1.5rem' }}>
          {formError && <div style={{ color: '#c00', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Email *</label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Full Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Role *</label>
              <select value={formRole} onChange={(e) => setFormRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' }}>
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {submitting ? 'Inviting...' : 'Invite User'}
          </button>
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>User will receive a temporary password by email.</p>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Name</th>
            <th style={{ padding: '0.75rem' }}>Email</th>
            <th style={{ padding: '0.75rem' }}>Role</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
            <th style={{ padding: '0.75rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{u.name}</td>
              <td style={{ padding: '0.75rem' }}>{u.email}</td>
              <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{u.role}</td>
              <td style={{ padding: '0.75rem' }}>
                {u.isActive ? <span style={{ color: '#090' }}>Active</span> : <span style={{ color: '#c00' }}>Disabled</span>}
              </td>
              <td style={{ padding: '0.75rem' }}>
                {u.isActive && (
                  <button onClick={() => handleDeactivate(u.id)} style={{ background: 'none', border: '1px solid #c00', color: '#c00', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>
                    Deactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No users found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
