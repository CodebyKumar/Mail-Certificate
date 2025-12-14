import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Plus,
  Calendar,
  Users,
  Mail,
  CheckCircle,
  Clock,
  ArrowRight,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api';
import './Dashboard.css';

interface Event {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  participant_count: number;
  sent_count: number;
  feedback_enabled: boolean;
  feedback_count: number;
}

interface DashboardStats {
  totalEvents: number;
  totalParticipants: number;
  totalSent: number;
  totalFeedback: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalParticipants: 0,
    totalSent: 0,
    totalFeedback: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await eventsApi.list();
      const eventsList = response.data;
      setEvents(eventsList);

      // Calculate stats
      const calculatedStats = eventsList.reduce(
        (acc: DashboardStats, event: Event) => ({
          totalEvents: acc.totalEvents + 1,
          totalParticipants: acc.totalParticipants + (event.participant_count || 0),
          totalSent: acc.totalSent + (event.sent_count || 0),
          totalFeedback: acc.totalFeedback + (event.feedback_count || 0)
        }),
        { totalEvents: 0, totalParticipants: 0, totalSent: 0, totalFeedback: 0 }
      );
      setStats(calculatedStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventProgress = (event: Event) => {
    if (!event.participant_count) return 0;
    return Math.round((event.sent_count / event.participant_count) * 100);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome back, {user?.name || 'User'}!</h1>
            <p>Manage your certificate campaigns and track delivery</p>
          </div>
          <motion.button
            className="create-event-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/events/new')}
          >
            <Plus size={20} />
            New Event
          </motion.button>
        </div>
      </div>

      <div className="dashboard-stats">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon events">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalEvents}</span>
            <span className="stat-label">Total Events</span>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon participants">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalParticipants}</span>
            <span className="stat-label">Participants</span>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon sent">
            <Mail size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalSent}</span>
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
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalFeedback}</span>
            <span className="stat-label">Feedback Received</span>
          </div>
        </motion.div>
      </div>

      <div className="dashboard-content">
        <div className="events-section">
          <div className="section-header">
            <h2>
              <Activity size={20} />
              Recent Events
            </h2>
            <Link to="/events" className="view-all-link">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <Award size={48} />
              <h3>No Events Yet</h3>
              <p>Create your first event using the button above</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.slice(0, 6).map((event, index) => (
                <motion.div
                  key={event.id}
                  className="event-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div className="event-card-header">
                    <h3>{event.name}</h3>
                    <span className="event-date">
                      <Clock size={14} />
                      {formatDate(event.created_at)}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}

                  <div className="event-stats">
                    <div className="event-stat">
                      <Users size={16} />
                      <span>{event.participant_count || 0} participants</span>
                    </div>
                    <div className="event-stat">
                      <Mail size={16} />
                      <span>{event.sent_count || 0} sent</span>
                    </div>
                    {event.feedback_enabled && (
                      <div className="event-stat feedback">
                        <CheckCircle size={16} />
                        <span>{event.feedback_count || 0} feedback</span>
                      </div>
                    )}
                  </div>

                  <div className="event-progress">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span>{getEventProgress(event)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${getEventProgress(event)}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="quick-actions">
          <div className="section-header">
            <h2>
              <TrendingUp size={20} />
              Quick Actions
            </h2>
          </div>

          <div className="actions-list">
            <motion.div
              className="action-item"
              whileHover={{ x: 5 }}
              onClick={() => navigate('/events/new')}
            >
              <div className="action-icon">
                <Plus size={20} />
              </div>
              <div className="action-info">
                <h4>Create New Event</h4>
                <p>Set up a new certificate campaign</p>
              </div>
              <ArrowRight size={18} />
            </motion.div>

            <motion.div
              className="action-item"
              whileHover={{ x: 5 }}
              onClick={() => navigate('/settings')}
            >
              <div className="action-icon">
                <Settings size={20} />
              </div>
              <div className="action-info">
                <h4>Email Settings</h4>
                <p>Configure your Gmail credentials</p>
              </div>
              <ArrowRight size={18} />
            </motion.div>

            <motion.div
              className="action-item"
              whileHover={{ x: 5 }}
              onClick={() => navigate('/events')}
            >
              <div className="action-icon">
                <Calendar size={20} />
              </div>
              <div className="action-info">
                <h4>Manage Events</h4>
                <p>View and edit your events</p>
              </div>
              <ArrowRight size={18} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
