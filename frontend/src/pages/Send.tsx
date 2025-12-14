import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Mail,
  Users,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { eventsApi, sendApi } from '../api';
import './Send.css';

interface Event {
  id: string;
  name: string;
  participant_count: number;
  sent_count: number;
  feedback_enabled: boolean;
  feedback_count: number;
  has_template: boolean;
}

interface SendResult {
  name: string;
  email: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
  timestamp?: string;
}

interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function SendPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [progress, setProgress] = useState<SendProgress>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [error, setError] = useState('');
  const [sendMode, setSendMode] = useState<'all' | 'pending'>('pending');

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const [eventRes, resultsRes] = await Promise.all([
        eventsApi.get(eventId!),
        sendApi.getResults(eventId!).catch(() => ({ data: null }))
      ]);
      setEvent(eventRes.data);
      
      const stats = resultsRes.data?.statistics;
      if (stats) {
        setProgress({
          total: stats.total || 0,
          sent: (stats.certificate_sent || 0) + (stats.feedback_sent || 0),
          failed: stats.failed || 0,
          pending: stats.pending || 0
        });
      } else {
        setProgress({
          total: eventRes.data.participant_count || 0,
          sent: eventRes.data.sent_count || 0,
          failed: 0,
          pending: (eventRes.data.participant_count || 0) - (eventRes.data.sent_count || 0)
        });
      }
    } catch (err) {
      console.error('Failed to load event:', err);
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSending = async () => {
    if (!event) return;

    // Validation checks
    if (!event.has_template) {
      setError('Please upload a certificate template first');
      return;
    }
    if (event.participant_count === 0) {
      setError('Please add participants first');
      return;
    }

    setSending(true);
    setError('');
    setResults([]);

    try {
      const response = await sendApi.send(eventId!, { send_all: sendMode === 'all' });
      
      // Update results as they come in
      if (response.data.details) {
        setResults(response.data.details.map((d: any) => ({
          name: d.name,
          email: d.email,
          status: d.status === 'certificate_sent' || d.status === 'feedback_sent' ? 'success' : 'error',
          message: d.status
        })));
        setProgress({
          total: response.data.total,
          sent: response.data.successful,
          failed: response.data.failed,
          pending: response.data.total - response.data.successful - response.data.failed
        });
      }

      // Reload event data
      await loadEventData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send certificates');
    } finally {
      setSending(false);
    }
  };

  const exportResults = () => {
    const csv = [
      ['Name', 'Email', 'Status', 'Message', 'Timestamp'].join(','),
      ...results.map(r => [
        r.name,
        r.email,
        r.status,
        r.message || '',
        r.timestamp || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `send-results-${event?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProgressPercent = () => {
    if (progress.total === 0) return 0;
    return Math.round((progress.sent / progress.total) * 100);
  };

  const canStartSending = event && event.has_template && event.participant_count > 0;

  if (loading) {
    return (
      <div className="send-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="send-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`/events/${eventId}`)}>
          <ArrowLeft size={20} />
          Back to Event
        </button>
        <div className="header-info">
          <h1>Send Certificates</h1>
          <p>{event?.name}</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-cards">
        <div className="status-card">
          <div className="card-icon participants">
            <Users size={24} />
          </div>
          <div className="card-info">
            <span className="value">{event?.participant_count || 0}</span>
            <span className="label">Total Participants</span>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon sent">
            <Mail size={24} />
          </div>
          <div className="card-info">
            <span className="value">{progress.sent}</span>
            <span className="label">Sent Successfully</span>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon pending">
            <Clock size={24} />
          </div>
          <div className="card-info">
            <span className="value">{progress.pending}</span>
            <span className="label">Pending</span>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon failed">
            <XCircle size={24} />
          </div>
          <div className="card-info">
            <span className="value">{progress.failed}</span>
            <span className="label">Failed</span>
          </div>
        </div>
      </div>

      {/* Send Controls */}
      <div className="send-controls">
        <div className="control-panel">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {!canStartSending ? (
            <div className="requirements-check">
              <h3>Requirements</h3>
              <div className={`requirement ${event?.has_template ? 'met' : ''}`}>
                {event?.has_template ? <CheckCircle size={18} /> : <XCircle size={18} />}
                Certificate template uploaded
              </div>
              <div className={`requirement ${(event?.participant_count || 0) > 0 ? 'met' : ''}`}>
                {(event?.participant_count || 0) > 0 ? <CheckCircle size={18} /> : <XCircle size={18} />}
                Participants added ({event?.participant_count || 0})
              </div>
            </div>
          ) : (
            <>
              <div className="send-options">
                <h3>Send Options</h3>
                <div className="option-group">
                  <label className={sendMode === 'pending' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="sendMode"
                      value="pending"
                      checked={sendMode === 'pending'}
                      onChange={() => setSendMode('pending')}
                    />
                    <Clock size={18} />
                    <div>
                      <span>Pending Only</span>
                      <small>Send to {progress.pending} participants who haven't received yet</small>
                    </div>
                  </label>
                  <label className={sendMode === 'all' ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="sendMode"
                      value="all"
                      checked={sendMode === 'all'}
                      onChange={() => setSendMode('all')}
                    />
                    <Users size={18} />
                    <div>
                      <span>All Participants</span>
                      <small>Send to all {event?.participant_count} participants (resend)</small>
                    </div>
                  </label>
                </div>
              </div>

              {event?.feedback_enabled && (
                <div className="feedback-notice">
                  <MessageSquare size={18} />
                  <p>Feedback mode is enabled. Participants will receive feedback link instead of direct certificate.</p>
                </div>
              )}
            </>
          )}

          <div className="control-actions">
            <motion.button
              className="send-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartSending}
              disabled={!canStartSending || sending}
            >
              {sending ? (
                <>
                  <div className="spinner-small"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Start Sending
                </>
              )}
            </motion.button>

            {results.length > 0 && (
              <motion.button
                className="export-btn"
                whileHover={{ scale: 1.02 }}
                onClick={exportResults}
              >
                <Download size={18} />
                Export Results
              </motion.button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {(sending || results.length > 0) && (
          <div className="progress-section">
            <div className="progress-header">
              <span>Progress</span>
              <span>{getProgressPercent()}%</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${getProgressPercent()}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="progress-stats">
              <span className="success">{progress.sent} sent</span>
              <span className="failed">{progress.failed} failed</span>
              <span className="pending">{progress.pending} pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="results-section">
          <div className="section-header">
            <h2>
              <FileText size={20} />
              Send Results
            </h2>
            <button className="refresh-btn" onClick={loadEventData}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          <div className="results-table">
            <div className="table-header">
              <div className="col-status">Status</div>
              <div className="col-name">Name</div>
              <div className="col-email">Email</div>
              <div className="col-message">Message</div>
            </div>
            <div className="table-body">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  className={`table-row ${result.status}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * index }}
                >
                  <div className="col-status">
                    {result.status === 'success' && <CheckCircle size={18} />}
                    {result.status === 'error' && <XCircle size={18} />}
                    {result.status === 'pending' && <Clock size={18} />}
                  </div>
                  <div className="col-name">{result.name}</div>
                  <div className="col-email">{result.email}</div>
                  <div className="col-message">{result.message || '-'}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
