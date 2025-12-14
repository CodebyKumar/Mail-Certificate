import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  LayoutDashboard,
  Calendar,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/events', icon: Calendar, label: 'Events' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (user?.is_admin) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <NavLink to="/dashboard" className="logo">
              <Award size={28} />
              <span>CertMailer</span>
            </NavLink>
          </div>

          <nav className="nav-desktop">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-right">
            <div className="user-menu">
              <button 
                className="user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="user-name">{user?.name || 'User'}</span>
                <ChevronDown size={16} className={userMenuOpen ? 'rotated' : ''} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    className="user-dropdown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <div className="dropdown-header">
                      <span className="name">{user?.name}</span>
                      <span className="email">{user?.email}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                      <Settings size={18} />
                      Settings
                    </button>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <LogOut size={18} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            className="nav-mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
            <button className="nav-link logout" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="overlay"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}
