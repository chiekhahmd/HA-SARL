/**
 * App Shell Layout — responsive sidebar + header + content area.
 * Mobile: hamburger menu, sidebar slides in as overlay.
 * Desktop: fixed sidebar always visible.
 */
import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useTenant } from '../tenant/TenantProvider';

const NAV_ITEMS = [
  { path: '/projects', label: '📊 Projects', module: 'projects', roles: ['admin', 'manager'] },
  { path: '/workers', label: '👷 Workers', module: 'workers', roles: ['admin', 'manager'] },
  { path: '/time-entries', label: '⏱️ Time', module: 'time-tracking', roles: ['admin', 'manager', 'worker'] },
  { path: '/absences', label: '🏖️ Absences', module: 'absences', roles: ['admin', 'manager', 'worker'] },
  { path: '/materials', label: '📦 Materials', module: 'materials', roles: ['admin', 'manager'] },
  { path: '/vehicles', label: '🚗 Vehicles', module: 'vehicles', roles: ['admin', 'manager'] },
  { path: '/reports', label: '📈 Reports', module: 'reports', roles: ['admin', 'manager'] },
  { path: '/users', label: '👥 Users', module: null, roles: ['admin'] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { config, isModuleEnabled } = useTenant();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!user || !item.roles.includes(user.role)) return false;
    if (item.module && !isModuleEnabled(item.module)) return false;
    return true;
  });

  const appName = config?.branding.app_name || 'Society ERP';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile header */}
      <header className="mobile-header">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="menu-btn"
        >
          ☰
        </button>
        <span className="mobile-title">{appName}</span>
      </header>

      {/* Overlay backdrop (mobile) */}
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <h2 className="sidebar-title">{appName}</h2>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-email">{user?.email}</div>
          <div className="user-role">Role: {user?.role}</div>
          <button onClick={logout} className="logout-btn">Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>

      <style>{`
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: #1a1a2e;
          color: #fff;
          align-items: center;
          padding: 0 1rem;
          z-index: 1000;
          gap: 0.75rem;
        }
        .menu-btn {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        .mobile-title {
          font-size: 1rem;
          font-weight: 600;
        }
        .sidebar-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1001;
        }
        .sidebar {
          width: 220px;
          min-width: 220px;
          background: #1a1a2e;
          color: #fff;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
        }
        .sidebar-title {
          font-size: 1.1rem;
          margin: 0 0 2rem 0;
        }
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .nav-link {
          display: block;
          padding: 0.6rem 0.75rem;
          border-radius: 6px;
          color: #aaa;
          text-decoration: none;
          font-size: 0.95rem;
          transition: background 0.15s;
        }
        .nav-link:hover { background: #16213e; color: #fff; }
        .nav-link.active { background: #16213e; color: #fff; }
        .sidebar-footer {
          border-top: 1px solid #333;
          padding-top: 1rem;
          font-size: 0.85rem;
        }
        .user-email { margin-bottom: 0.3rem; word-break: break-all; }
        .user-role { margin-bottom: 0.5rem; opacity: 0.7; }
        .logout-btn {
          background: none;
          border: 1px solid #555;
          color: #aaa;
          padding: 0.3rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .main-content {
          flex: 1;
          padding: 2rem;
          background: #f5f5f5;
          min-width: 0;
          overflow-x: auto;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }
          .sidebar-backdrop {
            display: block;
          }
          .sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            width: 260px;
            min-width: 260px;
            height: 100vh;
            z-index: 1002;
            transition: left 0.25s ease;
            padding-top: 1rem;
          }
          .sidebar.open {
            left: 0;
          }
          .main-content {
            padding: 1rem;
            padding-top: calc(56px + 1rem);
          }
        }
      `}</style>
    </div>
  );
}
