import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { buildAdminNotifications } from '../../lib/notifications';
import { formatDate } from '../../lib/dates';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function AppLayout({ nav, portalLabel, showNotifications = false, children }) {
  const { user, logout } = useAuth();
  const { db } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const notifications = showNotifications ? buildAdminNotifications(db) : [];
  const dismissed = new Set(db.dismissedNotifications || []);
  const unread = notifications.filter((notification) => !dismissed.has(notification.id)).length;

  const items = nav.map((item) => ({
    ...item,
    badge: item.notifications ? unread : null,
  }));

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">HM</span>
          <div className="brand-text">
            <strong>Hostel Manager</strong>
            <span>{portalLabel}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar-sm">{initials(user?.name || user?.fullName || 'User')}</span>
            <div className="sidebar-user-text">
              <strong>{user?.fullName || user?.name}</strong>
              <span>{user?.username ? `@${user.username}` : ''}</span>
            </div>
          </div>
          <button type="button" className="nav-item nav-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-btn"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>
            <span className="topbar-portal">{portalLabel}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{formatDate(new Date())}</span>
            {showNotifications ? (
              <NavLink to="/admin/notifications" className="bell" aria-label="Notifications">
                <span aria-hidden="true">🔔</span>
                {unread > 0 ? <span className="bell-count">{unread > 99 ? '99+' : unread}</span> : null}
              </NavLink>
            ) : null}
            <div className="topbar-user">
              <strong>{user?.fullName || user?.name}</strong>
              <span>{user?.username ? `@${user.username}` : ''}</span>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
