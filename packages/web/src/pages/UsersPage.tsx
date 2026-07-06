/**
 * Users Page — Admin only, list and manage users.
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<User[]>('/users').then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading users...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>User Management</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Name</th>
            <th style={{ padding: '0.75rem' }}>Email</th>
            <th style={{ padding: '0.75rem' }}>Role</th>
            <th style={{ padding: '0.75rem' }}>Status</th>
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
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No users found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
