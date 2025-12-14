import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Upload,
  ArrowLeft,
  Search,
  Mail,
  CheckCircle,
  Clock,
  Trash2,
  Download,
  FileSpreadsheet,
  AlertCircle,
  X,
  Filter
} from 'lucide-react';
import { participantsApi, eventsApi, sendApi } from '../api';
import './Participants.css';

interface Participant {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'feedback_sent' | 'feedback_received' | 'certificate_sent' | 'failed';
  certificate_sent_at?: string;
  feedback_submitted_at?: string;
  error_message?: string;
}

interface Event {
  id: string;
  name: string;
  feedback_enabled: boolean;
}

export default function Participants() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      const [eventRes, participantsRes] = await Promise.all([
        eventsApi.get(eventId!),
        participantsApi.list(eventId!)
      ]);
      setEvent(eventRes.data);
      setParticipants(participantsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await participantsApi.upload(eventId, formData);
      await loadData();
      setShowUploadModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (participantId: string) => {
    if (!confirm('Remove this participant?')) return;
    
    try {
      await participantsApi.delete(eventId!, participantId);
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    } catch (err) {
      console.error('Failed to delete participant:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Remove ALL participants? This cannot be undone.')) return;
    
    try {
      await participantsApi.deleteAll(eventId!);
      setParticipants([]);
    } catch (err) {
      console.error('Failed to delete all participants:', err);
    }
  };

  const exportParticipants = () => {
    const csv = [
      ['Name', 'Email', 'Status', 'Certificate Sent At', 'Feedback Submitted At'].join(','),
      ...participants.map(p => [
        p.name,
        p.email,
        p.status,
        p.certificate_sent_at || '',
        p.feedback_submitted_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${event?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFeedback = async (anonymous: boolean = false) => {
    try {
      console.log('Exporting feedback for event:', eventId, 'anonymous:', anonymous);
      const response = await sendApi.downloadFeedback(eventId!, anonymous);
      console.log('Response received:', response);
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_${anonymous ? 'anonymous_' : ''}${event?.name || eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export feedback:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to export feedback';
      alert(`Error: ${errorMsg}`);
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'certificate_sent': return <CheckCircle size={16} />;
      case 'feedback_sent': return <Mail size={16} />;
      case 'feedback_received': return <Clock size={16} />;
      case 'failed': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'certificate_sent': return 'Certificate Sent';
      case 'feedback_sent': return 'Feedback Requested';
      case 'feedback_received': return 'Feedback Received';
      case 'failed': return 'Failed';
      default: return 'Pending';
    }
  };

  const stats = {
    total: participants.length,
    pending: participants.filter(p => p.status === 'pending').length,
    feedbackSent: participants.filter(p => p.status === 'feedback_sent').length,
    feedbackReceived: participants.filter(p => p.status === 'feedback_received').length,
    certificateSent: participants.filter(p => p.status === 'certificate_sent').length,
    failed: participants.filter(p => p.status === 'failed').length
  };

  if (loading) {
    return (
      <div className="participants-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="participants-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`/events/${eventId}`)}>
          <ArrowLeft size={20} />
          Back to Event
        </button>
        <div className="header-info">
          <h1>Participants</h1>
          <p>{event?.name}</p>
        </div>
        <div className="header-actions">
          {event?.feedback_enabled && (
            <motion.button
              className="btn-secondary"
              whileHover={{ scale: 1.02 }}
              onClick={() => exportFeedback(true)}
              title="Export anonymous feedback (no names/emails)"
            >
              <FileSpreadsheet size={18} />
              Export Feedback
            </motion.button>
          )}
          <motion.button
            className="btn-secondary"
            whileHover={{ scale: 1.02 }}
            onClick={exportParticipants}
            disabled={participants.length === 0}
          >
            <Download size={18} />
            Export Participants
          </motion.button>
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={18} />
            Upload Excel
          </motion.button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="value">{stats.total}</span>
          <span className="label">Total</span>
        </div>
        <div className="stat-item pending">
          <span className="value">{stats.pending}</span>
          <span className="label">Pending</span>
        </div>
        {event?.feedback_enabled ? (
          <>
            <div className="stat-item feedback-sent">
              <span className="value">{stats.feedbackSent}</span>
              <span className="label">Feedback Requested</span>
            </div>
            <div className="stat-item feedback-received">
              <span className="value">{stats.feedbackReceived}</span>
              <span className="label">Feedback Received</span>
            </div>
          </>
        ) : null}
        <div className="stat-item completed">
          <span className="value">{stats.certificateSent}</span>
          <span className="label">Certificate Sent</span>
        </div>
        {stats.failed > 0 && (
          <div className="stat-item failed">
            <span className="value">{stats.failed}</span>
            <span className="label">Failed</span>
          </div>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-select">
          <Filter size={18} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="feedback_sent">Feedback Requested</option>
            <option value="feedback_received">Feedback Received</option>
            <option value="certificate_sent">Certificate Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {participants.length > 0 && (
          <button className="clear-all-btn" onClick={handleDeleteAll}>
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="empty-state">
          <FileSpreadsheet size={64} />
          <h3>No Participants Yet</h3>
          <p>Upload an Excel file with name and email columns</p>
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={18} />
            Upload Excel
          </motion.button>
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="empty-state">
          <Search size={48} />
          <h3>No Results Found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="participants-table">
          <div className="table-header">
            <div className="col-name">Name</div>
            <div className="col-email">Email</div>
            <div className="col-status">Status</div>
            <div className="col-date">Last Updated</div>
            <div className="col-actions">Actions</div>
          </div>
          <div className="table-body">
            {filteredParticipants.map((participant, index) => (
              <motion.div
                key={participant.id}
                className="table-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * index }}
              >
                <div className="col-name">
                  <Users size={16} />
                  {participant.name}
                </div>
                <div className="col-email">{participant.email}</div>
                <div className={`col-status status-${participant.status}`}>
                  {getStatusIcon(participant.status)}
                  {getStatusLabel(participant.status)}
                </div>
                <div className="col-date">
                  {participant.certificate_sent_at 
                    ? new Date(participant.certificate_sent_at).toLocaleString()
                    : participant.feedback_submitted_at 
                    ? new Date(participant.feedback_submitted_at).toLocaleString()
                    : '-'}
                </div>
                <div className="col-actions">
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(participant.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              className="modal upload-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Upload Participants</h2>
                <button className="close-btn" onClick={() => setShowUploadModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-content">
                {error && (
                  <div className="error-msg">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="upload-info">
                  <FileSpreadsheet size={48} />
                  <h3>Excel File Format</h3>
                  <p>Your Excel file should have these columns:</p>
                  <ul>
                    <li><strong>name</strong> - Participant's full name</li>
                    <li><strong>email</strong> - Participant's email address</li>
                  </ul>
                </div>

                <div className="upload-area">
                  <input
                    type="file"
                    id="excel-upload"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    hidden
                  />
                  <label htmlFor="excel-upload" className={`upload-label ${uploading ? 'disabled' : ''}`}>
                    {uploading ? (
                      <>
                        <div className="spinner"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={32} />
                        <span>Click to select file</span>
                        <small>.xlsx, .xls, or .csv</small>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
