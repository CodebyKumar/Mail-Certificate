import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Calendar,
  Mail,
  MessageSquare,
  Trash2,
  Search,
  RefreshCw,
  Activity,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { adminApi } from '../api';
import './Admin.css';

interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  event_count: number;
  total_sent: number;
}

interface DashboardStats {
  total_users: number;
  total_events: number;
  total_certificates_sent: number;
  total_feedback: number;
}

export default function Admin() {
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_events: 0,
    total_certificates_sent: 0,
    total_feedback: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, usersRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getUsers()
      ]);
      setStats(dashboardRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      // Reload stats
      loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div className="header-title">
          <Shield size={32} className="admin-icon" />
          <div>
            <h1>Admin Dashboard</h1>
            <p>System overview and user management</p>
          </div>
        </div>
        <motion.button
          className="refresh-btn"
          whileHover={{ scale: 1.02 }}
          onClick={loadData}
        >
          <RefreshCw size={18} />
          Refresh
        </motion.button>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon users">
            <Users size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_users}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon events">
            <Calendar size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_events}</span>
            <span className="stat-label">Total Events</span>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon sent">
            <Mail size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_certificates_sent}</span>
            <span className="stat-label">Certificates Sent</span>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="stat-icon feedback">
            <MessageSquare size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_feedback}</span>
            <span className="stat-label">Feedback Received</span>
          </div>
        </motion.div>
      </div>

      {/* Users Section */}
      <div className="users-section">
        <div className="section-header">
          <div className="header-left">
            <Activity size={24} />
            <h2>User Management</h2>
            <span className="user-count">{users.length} users</span>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="users-table">
          <div className="table-header">
            <div className="col-user">User</div>
            <div className="col-events">Events</div>
            <div className="col-sent">Sent</div>
            <div className="col-date">Joined</div>
            <div className="col-actions"></div>
          </div>

          <div className="table-body">
            {filteredUsers.length === 0 ? (
              <div className="empty-row">
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  className={`table-row ${expandedUser === user.id ? 'expanded' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                >
                  <div className="row-main" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                    <div className="col-user">
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <span className="user-name">
                          {user.name}
                          {user.is_admin && <span className="admin-badge">Admin</span>}
                        </span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                    <div className="col-events">{user.event_count}</div>
                    <div className="col-sent">{user.total_sent}</div>
                    <div className="col-date">{new Date(user.created_at).toLocaleDateString()}</div>
                    <div className="col-actions">
                      <ChevronDown size={18} className={expandedUser === user.id ? 'rotated' : ''} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedUser === user.id && (
                      <motion.div
                        className="row-expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="expanded-content">
                          <div className="user-details">
                            <div className="detail-item">
                              <span className="label">User ID</span>
                              <span className="value">{user.id}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Account Type</span>
                              <span className="value">{user.is_admin ? 'Administrator' : 'Regular User'}</span>
                            </div>
                          </div>

                          {!user.is_admin && (
                            <div className="user-actions">
                              {deleteConfirm === user.id ? (
                                <div className="delete-confirm">
                                  <AlertTriangle size={18} />
                                  <span>Delete this user and all their data?</span>
                                  <button
                                    className="confirm-btn"
                                    onClick={() => handleDeleteUser(user.id)}
                                  >
                                    Yes, Delete
                                  </button>
                                  <button
                                    className="cancel-btn"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="delete-btn"
                                  onClick={() => setDeleteConfirm(user.id)}
                                >
                                  <Trash2 size={18} />
                                  Delete User
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
