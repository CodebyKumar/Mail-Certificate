import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Plus,
  Calendar,
  Users,
  Mail,
  Edit,
  Trash2,
  Upload,
  FileText,
  Save,
  X,
  ArrowLeft,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Eye,
  Move,
  Type
} from 'lucide-react';
import { eventsApi } from '../api';
import './Events.css';

interface Event {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  participant_count: number;
  sent_count: number;
  feedback_enabled: boolean;
  feedback_count: number;
  has_template: boolean;
}

interface EventForm {
  name: string;
  description: string;
}

interface TextSettings {
  y_position: number;
  font_name: string;
  font_size: number;
  text_color: string;
}

// Available font families for certificates
const FONT_OPTIONS = [
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Palatino Linotype', label: 'Palatino' },
  { value: 'Book Antiqua', label: 'Book Antiqua' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Arial', label: 'Arial (Sans-serif)' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Century Gothic', label: 'Century Gothic' },
  { value: 'Lucida Sans', label: 'Lucida Sans' },
  { value: 'Courier New', label: 'Courier New (Monospace)' },
  { value: 'Brush Script MT', label: 'Brush Script (Cursive)' },
  { value: 'Copperplate', label: 'Copperplate' },
  { value: 'Papyrus', label: 'Papyrus' },
];

interface FeedbackQuestion {
  id: string;
  question: string;
  type: 'text' | 'rating' | 'choice';
  options?: string[];
  required: boolean;
}

export default function Events() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Event detail state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'design' | 'feedback' | 'email'>('overview');
  const [textSettings, setTextSettings] = useState<TextSettings>({
    y_position: 300,
    font_name: 'Georgia',
    font_size: 48,
    text_color: '#000000'
  });
  const [emailSettings, setEmailSettings] = useState({
    email_subject: 'Your Certificate of Participation',
    email_body: 'Dear {name},\n\nPlease find attached your certificate.\n\nBest regards',
    feedback_email_subject: 'Complete Feedback to Receive Your Certificate - {event_name}',
    feedback_email_body: 'Dear {name},\n\nThank you for your participation in {event_name}!\n\nTo receive your certificate, please complete our quick feedback form:\n\n{feedback_url}\n\nYour certificate will be sent to this email address immediately after submitting the feedback.\n\nBest regards,\nThe Event Team'
  });
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>([]);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);

  // Canvas preview state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [previewName, setPreviewName] = useState('John Doe');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  useEffect(() => {
    if (eventId && eventId !== 'new') {
      loadEventDetails(eventId);
    } else {
      loadEvents();
    }
  }, [eventId]);

  const loadEvents = async () => {
    try {
      const response = await eventsApi.list();
      setEvents(response.data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventDetails = async (id: string) => {
    setLoading(true);
    try {
      const response = await eventsApi.get(id);
      setSelectedEvent(response.data);
      if (response.data.text_settings) {
        setTextSettings({
          y_position: response.data.text_settings.y_position ?? 300,
          font_name: response.data.text_settings.font_name ?? 'Georgia',
          font_size: response.data.text_settings.font_size ?? 48,
          text_color: response.data.text_settings.text_color ?? '#000000'
        });
      }
      setEmailSettings({
        email_subject: response.data.email_subject || 'Your Certificate of Participation',
        email_body: response.data.email_body || 'Dear {name},\n\nPlease find attached your certificate.\n\nBest regards',
        feedback_email_subject: response.data.feedback_email_subject || 'Complete Feedback to Receive Your Certificate - {event_name}',
        feedback_email_body: response.data.feedback_email_body || 'Dear {name},\n\nThank you for your participation in {event_name}!\n\nTo receive your certificate, please complete our quick feedback form:\n\n{feedback_url}\n\nYour certificate will be sent to this email address immediately after submitting the feedback.\n\nBest regards,\nThe Event Team'
      });
      if (response.data.feedback_questions) {
        setFeedbackQuestions(response.data.feedback_questions);
      }
      setFeedbackEnabled(response.data.feedback_enabled || false);
      
      // Load template image if exists
      if (response.data.has_template) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log('Template loaded:', img.width, 'x', img.height);
          setTemplateImage(img);
        };
        img.onerror = (e) => {
          console.error('Failed to load template image:', e);
        };
        img.src = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/events/${id}/template?t=${Date.now()}`;
      } else {
        setTemplateImage(null);
      }
    } catch (err) {
      console.error('Failed to load event:', err);
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  // Draw preview canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with gray background
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (templateImage) {
      // Scale to fit canvas while maintaining original aspect ratio
      const scale = Math.min(canvas.width / templateImage.width, canvas.height / templateImage.height);
      const scaledWidth = templateImage.width * scale;
      const scaledHeight = templateImage.height * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;
      
      // Draw template centered with original aspect ratio
      ctx.drawImage(templateImage, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // Calculate text position - Y position is in template coordinates
      // Scale it to canvas position
      const textX = canvas.width / 2;
      const textY = offsetY + (textSettings.y_position * scale);
      const scaledFontSize = textSettings.font_size * scale;
      
      ctx.font = `${scaledFontSize}px "${textSettings.font_name}", Georgia, serif`;
      ctx.fillStyle = textSettings.text_color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(previewName, textX, textY);
      
      // Draw horizontal position indicator line
      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(offsetX + 20, textY);
      ctx.lineTo(offsetX + scaledWidth - 20, textY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Show Y position in template pixels
      ctx.fillStyle = '#e67e22';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Y: ${textSettings.y_position}px (of ${templateImage.height}px)`, offsetX + 10, offsetY + 10);
    } else {
      // No template - show placeholder
      ctx.fillStyle = '#666';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a template to see preview', canvas.width / 2, canvas.height / 2);
    }
  }, [templateImage, textSettings, previewName]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Redraw when switching to design tab
  useEffect(() => {
    if (activeTab === 'design') {
      // Small delay to ensure canvas is mounted
      setTimeout(() => drawPreview(), 100);
    }
  }, [activeTab, drawPreview]);

  // Handle canvas drag to position text
  const handleCanvasMouseDown = () => {
    if (!templateImage || !canvasRef.current) return;
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !templateImage || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Calculate scale and offset (same as in drawPreview)
    const scale = Math.min(canvas.width / templateImage.width, canvas.height / templateImage.height);
    const scaledHeight = templateImage.height * scale;
    const offsetY = (canvas.height - scaledHeight) / 2;
    
    // Convert mouse Y position to template coordinates
    const imgY = (mouseY - offsetY) / scale;
    
    // Clamp to template bounds
    const clampedY = Math.max(0, Math.min(templateImage.height, imgY));
    
    setTextSettings(prev => ({
      ...prev,
      y_position: Math.round(clampedY)
    }));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Event name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingEvent) {
        await eventsApi.update(editingEvent.id, form);
      } else {
        const response = await eventsApi.create(form);
        navigate(`/events/${response.data.id}`);
      }
      setShowModal(false);
      setForm({ name: '', description: '' });
      setEditingEvent(null);
      loadEvents();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await eventsApi.delete(id);
      loadEvents();
      if (eventId === id) {
        navigate('/events');
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent) return;

    setUploadingTemplate(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await eventsApi.uploadTemplate(selectedEvent.id, formData);
      
      // Reload the template image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setTemplateImage(img);
        setUploadingTemplate(false);
      };
      img.onerror = () => {
        setUploadingTemplate(false);
      };
      img.src = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/events/${selectedEvent.id}/template?t=${Date.now()}`;
      
      // Reload event details
      loadEventDetails(selectedEvent.id);
    } catch (err) {
      console.error('Failed to upload template:', err);
      setUploadingTemplate(false);
    }
  };

  const handleSaveTextSettings = async () => {
    if (!selectedEvent) return;
    
    setSaving(true);
    try {
      await eventsApi.update(selectedEvent.id, {
        text_settings: textSettings,
        email_subject: emailSettings.email_subject,
        email_body: emailSettings.email_body,
        feedback_email_subject: emailSettings.feedback_email_subject,
        feedback_email_body: emailSettings.feedback_email_body
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedEvent) return;
    
    setSaving(true);
    try {
      await eventsApi.update(selectedEvent.id, {
        feedback_enabled: feedbackEnabled,
        feedback_questions: feedbackQuestions
      });
    } catch (err) {
      console.error('Failed to save feedback settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const addFeedbackQuestion = () => {
    setFeedbackQuestions([
      ...feedbackQuestions,
      {
        id: Date.now().toString(),
        question: '',
        type: 'text',
        required: true
      }
    ]);
  };

  const updateFeedbackQuestion = (id: string, updates: Partial<FeedbackQuestion>) => {
    setFeedbackQuestions(questions =>
      questions.map(q => q.id === id ? { ...q, ...updates } : q)
    );
  };

  const removeFeedbackQuestion = (id: string) => {
    setFeedbackQuestions(questions => questions.filter(q => q.id !== id));
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setForm({ name: event.name, description: event.description || '' });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  // If viewing event details
  if (eventId && eventId !== 'new' && selectedEvent) {
    return (
      <div className="event-detail">
        <div className="detail-header">
          <button className="back-btn" onClick={() => navigate('/events')}>
            <ArrowLeft size={20} />
            Back to Events
          </button>
          <div className="detail-title">
            <h1>{selectedEvent.name}</h1>
            <p>{selectedEvent.description}</p>
          </div>
          <div className="detail-actions">
            <motion.button
              className="btn-secondary"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/events/${selectedEvent.id}/participants`)}
            >
              <Users size={18} />
              Participants
            </motion.button>
            <motion.button
              className="btn-primary"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/events/${selectedEvent.id}/send`)}
            >
              <Send size={18} />
              Send Certificates
            </motion.button>
          </div>
        </div>

        <div className="detail-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FileText size={18} />
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'design' ? 'active' : ''}`}
            onClick={() => setActiveTab('design')}
          >
            <Award size={18} />
            Certificate Design
          </button>
          <button
            className={`tab ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <MessageSquare size={18} />
            Feedback Form
          </button>
          <button
            className={`tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={18} />
            Email Templates
          </button>
        </div>

        <div className="detail-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="stats-row">
                <div className="stat-box">
                  <Users size={24} />
                  <div>
                    <span className="value">{selectedEvent.participant_count || 0}</span>
                    <span className="label">Participants</span>
                  </div>
                </div>
                <div className="stat-box">
                  <Mail size={24} />
                  <div>
                    <span className="value">{selectedEvent.sent_count || 0}</span>
                    <span className="label">Sent</span>
                  </div>
                </div>
                <div className="stat-box">
                  <CheckCircle size={24} />
                  <div>
                    <span className="value">{selectedEvent.feedback_count || 0}</span>
                    <span className="label">Feedback</span>
                  </div>
                </div>
              </div>

              <div className="status-checklist">
                <h3>Setup Checklist</h3>
                <div className={`checklist-item ${selectedEvent.has_template ? 'done' : ''}`}>
                  {selectedEvent.has_template ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>Certificate template uploaded</span>
                </div>
                <div className={`checklist-item ${selectedEvent.participant_count > 0 ? 'done' : ''}`}>
                  {selectedEvent.participant_count > 0 ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>Participants added</span>
                </div>
                <div className="checklist-item done">
                  <CheckCircle size={18} />
                  <span>Text settings configured</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="design-tab">
              <div className="design-layout">
                {/* Left Panel - Settings */}
                <div className="design-settings">
                  {/* Template Upload */}
                  <div className="settings-section">
                    <h3><Upload size={18} /> Template</h3>
                    <div className="template-upload-compact">
                      <input
                        type="file"
                        id="template-upload"
                        accept="image/*"
                        onChange={handleTemplateUpload}
                        hidden
                      />
                      <label htmlFor="template-upload" className={`upload-btn ${uploadingTemplate ? 'uploading' : ''}`}>
                        <Upload size={16} />
                        {uploadingTemplate ? 'Uploading...' : selectedEvent?.has_template ? 'Change Template' : 'Upload Template'}
                      </label>
                      {selectedEvent?.has_template && (
                        <span className="template-status">
                          <CheckCircle size={14} />
                          Template loaded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Name Input */}
                  <div className="settings-section">
                    <h3><Eye size={18} /> Preview</h3>
                    <div className="input-group">
                      <label>Sample Name</label>
                      <input
                        type="text"
                        value={previewName}
                        onChange={e => setPreviewName(e.target.value)}
                        placeholder="Enter name to preview"
                      />
                    </div>
                  </div>

                  {/* Position Settings */}
                  <div className="settings-section">
                    <h3><Move size={18} /> Name Position</h3>
                    <p className="hint">Drag vertically on preview or enter Y value (name is always centered horizontally)</p>
                    <div className="input-group">
                      <label>Y Position (vertical)</label>
                      <input
                        type="number"
                        value={textSettings.y_position}
                        onChange={e => setTextSettings({...textSettings, y_position: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  {/* Font Settings */}
                  <div className="settings-section">
                    <h3><Type size={18} /> Font Settings</h3>
                    <div className="input-group">
                      <label>Font Family</label>
                      <select
                        value={textSettings.font_name}
                        onChange={e => setTextSettings({...textSettings, font_name: e.target.value})}
                        className="font-select"
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-row">
                      <div className="input-group">
                        <label>Size</label>
                        <input
                          type="number"
                          value={textSettings.font_size}
                          onChange={e => setTextSettings({...textSettings, font_size: parseInt(e.target.value) || 24})}
                        />
                      </div>
                      <div className="input-group">
                        <label>Color</label>
                        <input
                          type="color"
                          value={textSettings.text_color}
                          onChange={e => setTextSettings({...textSettings, text_color: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="font-preview" style={{ fontFamily: textSettings.font_name, fontSize: '18px', marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '6px', textAlign: 'center' }}>
                      {previewName}
                    </div>
                  </div>

                  {/* Save Button */}
                  <motion.button
                    className="save-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveTextSettings}
                    disabled={saving}
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </motion.button>
                </div>

                {/* Right Panel - Preview */}
                <div className="design-preview">
                  <div className="preview-header">
                    <h3>Live Preview</h3>
                    <span className="preview-hint">Click and drag to position the name</span>
                  </div>
                  <div className="canvas-container">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={600}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="feedback-tab">
              <div className="feedback-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={feedbackEnabled}
                    onChange={e => setFeedbackEnabled(e.target.checked)}
                  />
                  <span className="toggle-switch"></span>
                  <span>Require feedback before certificate delivery</span>
                </label>
              </div>

              <AnimatePresence>
                {feedbackEnabled && (
                  <motion.div
                    className="feedback-questions"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <h3>Feedback Questions</h3>
                    
                    {feedbackQuestions.map((q, index) => (
                      <div key={q.id} className="question-item">
                        <div className="question-header">
                          <span>Question {index + 1}</span>
                          <button onClick={() => removeFeedbackQuestion(q.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter your question"
                          value={q.question}
                          onChange={e => updateFeedbackQuestion(q.id, { question: e.target.value })}
                        />
                        <div className="question-options">
                          <select
                            value={q.type}
                            onChange={e => updateFeedbackQuestion(q.id, { type: e.target.value as any })}
                          >
                            <option value="text">Text Answer</option>
                            <option value="rating">Rating (1-5)</option>
                            <option value="choice">Multiple Choice</option>
                          </select>
                          <label>
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={e => updateFeedbackQuestion(q.id, { required: e.target.checked })}
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))}

                    <button className="add-question-btn" onClick={addFeedbackQuestion}>
                      <Plus size={18} />
                      Add Question
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                className="save-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveFeedback}
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Feedback Settings'}
              </motion.button>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="email-tab">
              <div className="email-templates-grid">
                <div className="email-template-section">
                  <h3><Mail size={18} /> Certificate Email</h3>
                  <p className="section-hint">Sent with the certificate attachment (when feedback is disabled). Use {'{name}'} placeholder for the participant's name.</p>
                  <div className="input-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={emailSettings.email_subject}
                      onChange={e => setEmailSettings({...emailSettings, email_subject: e.target.value})}
                      placeholder="e.g., Your Certificate for {name}"
                    />
                  </div>
                  <div className="input-group">
                    <label>Body</label>
                    <textarea
                      rows={10}
                      value={emailSettings.email_body}
                      onChange={e => setEmailSettings({...emailSettings, email_body: e.target.value})}
                      placeholder="Use {name} to insert participant name"
                    />
                  </div>
                </div>

                <div className="email-template-section">
                  <h3><MessageSquare size={18} /> Feedback Request Email</h3>
                  <p className="section-hint">Sent to request feedback before certificate (when feedback is enabled). Available placeholders: {'{name}'}, {'{event_name}'}, {'{feedback_url}'}</p>
                  <div className="input-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={emailSettings.feedback_email_subject}
                      onChange={e => setEmailSettings({...emailSettings, feedback_email_subject: e.target.value})}
                      placeholder="e.g., Complete Your Feedback - {event_name}"
                    />
                  </div>
                  <div className="input-group">
                    <label>Body</label>
                    <textarea
                      rows={10}
                      value={emailSettings.feedback_email_body}
                      onChange={e => setEmailSettings({...emailSettings, feedback_email_body: e.target.value})}
                      placeholder="Use {name}, {event_name}, and {feedback_url} as placeholders"
                    />
                  </div>
                </div>
              </div>

              <motion.button
                className="save-btn email-save-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveTextSettings}
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Email Templates'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Events list view
  return (
    <div className="events-page">
      <div className="page-header">
        <div>
          <h1>Events</h1>
          <p>Manage your certificate campaigns</p>
        </div>
        <motion.button
          className="create-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
        >
          <Plus size={20} />
          Create Event
        </motion.button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <Calendar size={64} />
          <h3>No Events Yet</h3>
          <p>Create your first event using the button above</p>
        </div>
      ) : (
        <div className="events-list">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              className="event-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <div className="event-info" onClick={() => navigate(`/events/${event.id}`)}>
                <div className="event-icon">
                  <Award size={24} />
                </div>
                <div className="event-details">
                  <h3>{event.name}</h3>
                  <p>{event.description || 'No description'}</p>
                  <div className="event-meta">
                    <span><Users size={14} /> {event.participant_count || 0}</span>
                    <span><Mail size={14} /> {event.sent_count || 0} sent</span>
                    <span><Calendar size={14} /> {new Date(event.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="event-actions">
                <button className="action-btn" onClick={() => openEditModal(event)}>
                  <Edit size={18} />
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(event.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingEvent ? 'Edit Event' : 'Create Event'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {error && <div className="error-msg">{error}</div>}
                
                <div className="form-group">
                  <label>Event Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g., Annual Conference 2024"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Brief description of the event"
                    rows={3}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={saving}>
                    {saving ? 'Saving...' : (editingEvent ? 'Save Changes' : 'Create Event')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
