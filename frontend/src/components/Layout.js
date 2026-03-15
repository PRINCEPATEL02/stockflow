import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../image/logo.jpg';

const NAV = [
  { to: '/',            icon: '⊞', label: 'Dashboard',       exact: true },
  { to: '/products',    icon: '📦', label: 'Products' },
  { to: '/materials',   icon: '🧪', label: 'Raw Materials' },
  { to: '/purchases',   icon: '📥', label: 'Stock-In History' },
  { to: '/sales',       icon: '💰', label: 'Sales' },
  { to: '/transactions',icon: '📋', label: 'Transactions' },
];

const PAGE_TITLES = {
  '/':             'Dashboard',
  '/products':     'Products',
  '/materials':    'Raw Materials',
  '/purchases':    'Stock-In History',
  '/sales':        'Sales',
  '/transactions': 'Transaction History',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 768) setSidebarOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const title = PAGE_TITLES[location.pathname] || 'StockFlow';

  return (
    <div className="app-shell">
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" className="logo-img" />
          <div className="logo-text">
            <h1>StockFlow</h1>
            <span>ERP System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ to, icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <div className="u-name">{user?.name}</div>
              <div className="u-role">{user?.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <div className="top-bar-left">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label="Toggle menu"
            >
              <span style={{ transform: sidebarOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span style={{ opacity: sidebarOpen ? 0 : 1 }} />
              <span style={{ transform: sidebarOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
            </button>
            <span className="top-bar-title">{title}</span>
          </div>
          <div className="top-bar-right">
            <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>● Live</span>
            <span className="badge badge-gray" style={{ display: 'none', fontSize: '0.72rem' }}
              id="user-badge-mobile">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
