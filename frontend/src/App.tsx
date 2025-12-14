import { useState, useRef, useEffect } from 'react';
import { Upload, Mail, Settings, CheckCircle, XCircle, Loader, Play, Download, Award, Plus, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

interface FeedbackQuestion {
  id: string;
  question: string;
  type: 'text' | 'rating' | 'multiple_choice';
  options?: string[];
  required: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface ParticipantPreview {
  Name: string;
  Email: string;
}

interface ProcessResult {
  name: string;
  email: string;
  status: string;
  error?: string;
}

interface GenerateResults {
  total: number;
  successful: number;
  failed: number;
  details: ProcessResult[];
}

function App() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [activeTab, setActiveTab] = useState<'setup' | 'results'>('setup');
  
  // Template state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string>('');
  const [templateDimensions, setTemplateDimensions] = useState({ width: 0, height: 0 });
  
  // Text positioning
  const [textPosition, setTextPosition] = useState<Position>({ x: 0, y: 500 });
  const [fontSize, setFontSize] = useState(60);
  const [fontName, setFontName] = useState('Roboto');
  const [textColor, setTextColor] = useState('#000000');
  const [previewText, setPreviewText] = useState('John Doe');
  const [fonts, setFonts] = useState<string[]>([]);
  
  // Excel state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [participantPreview, setParticipantPreview] = useState<ParticipantPreview[]>([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  
  // Email settings
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [emailSubject, setEmailSubject] = useState('Your Participation Certificate');
  const [emailBody, setEmailBody] = useState('Dear {name},\n\nCongratulations! Please find attached your participation certificate.\n\nBest regards,\nYour Organization');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<GenerateResults | null>(null);
  
  // Feedback questions
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>([
    { id: '1', question: 'How would you rate the overall event?', type: 'rating', required: true },
    { id: '2', question: 'What did you like most about the event?', type: 'text', required: false },
  ]);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load available fonts
    axios.get(`${API_URL}/api/fonts`)
      .then(res => setFonts(res.data.fonts))
      .catch(err => console.error('Failed to load fonts:', err));
  }, []);

  const handleTemplateUpload = async (file: File) => {
    setTemplateFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    
    try {
      const response = await axios.post(`${API_URL}/api/upload-template`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      setTemplatePreview(`${API_URL}${response.data.preview_url}`);
      setTemplateDimensions({ width: response.data.width, height: response.data.height });
      
      // Set initial Y position to center
      setTextPosition({
        x: 0,
        y: Math.floor(response.data.height / 2)
      });
    } catch (error: any) {
      console.error('Template upload failed:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to upload template';
      alert(`Template upload failed: ${errorMsg}`);
      setTemplateFile(null);
    }
  };

  const handleExcelUpload = async (file: File) => {
    setExcelFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    
    try {
      const response = await axios.post(`${API_URL}/api/upload-excel`, formData);
      setParticipantCount(response.data.count);
      setParticipantPreview(response.data.preview);
    } catch (error: any) {
      console.error('Excel upload failed:', error);
      alert(error.response?.data?.detail || 'Failed to upload Excel file');
    }
  };

  const updatePreview = async () => {
    if (!templateFile) return;
    
    try {
      const response = await axios.post(`${API_URL}/api/preview-text`, {
        session_id: sessionId,
        x: textPosition.x,
        y: textPosition.y,
        font_size: fontSize,
        font_name: fontName,
        text: previewText,
        color: textColor
      });
      setTemplatePreview(`${API_URL}${response.data.preview_url}`);
    } catch (error) {
      console.error('Preview update failed:', error);
    }
  };

  useEffect(() => {
    if (templateFile) {
      const debounce = setTimeout(() => {
        updatePreview();
      }, 300);
      return () => clearTimeout(debounce);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textPosition, fontSize, fontName, textColor, previewText, templateFile]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !templateDimensions.width) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleY = templateDimensions.height / rect.height;
    
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    setTextPosition({ x: 0, y });
  };

  const handleValidate = async (showSuccessMessage: boolean = true) => {
    try {
      const response = await axios.post(`${API_URL}/api/validate`, {
        session_id: sessionId,
        email,
        app_password: appPassword,
        x: textPosition.x,
        y: textPosition.y,
        font_size: fontSize,
        font_name: fontName,
        color: textColor,
        email_subject: emailSubject,
        email_body: emailBody
      });
      
      if (response.data.valid) {
        if (showSuccessMessage) {
          alert('✓ All settings validated successfully!\n\nYou can now generate and send certificates.');
        }
        return true;
      } else {
        alert('❌ Validation Failed:\n\n' + response.data.errors.join('\n'));
        return false;
      }
    } catch (error: any) {
      alert('❌ Validation Error:\n\n' + (error.response?.data?.detail || error.message));
      return false;
    }
  };

  const handleGenerate = async () => {
    const isValid = await handleValidate(false);
    if (!isValid) return;
    
    setIsProcessing(true);
    setActiveTab('results');
    
    try {
      const response = await axios.post(`${API_URL}/api/generate`, {
        session_id: sessionId,
        email,
        app_password: appPassword,
        email_subject: emailSubject,
        email_body: emailBody,
        feedback_enabled: feedbackEnabled,
        feedback_questions: feedbackEnabled ? feedbackQuestions : []
      });
      
      setResults(response.data);
    } catch (error: any) {
      console.error('Generation failed:', error);
      alert('Failed to generate certificates: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const addFeedbackQuestion = () => {
    const newQuestion: FeedbackQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'text',
      required: false
    };
    setFeedbackQuestions([...feedbackQuestions, newQuestion]);
  };

  const updateFeedbackQuestion = (id: string, updates: Partial<FeedbackQuestion>) => {
    setFeedbackQuestions(feedbackQuestions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const removeFeedbackQuestion = (id: string) => {
    setFeedbackQuestions(feedbackQuestions.filter(q => q.id !== id));
  };

  const downloadResults = () => {
    if (!results) return;

    const csvContent = [
      ['Name', 'Email', 'Status', 'Error'],
      ...results.details.map(d => [
        d.name,
        d.email,
        d.status,
        d.error || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="logo">
            <Award className="logo-icon" />
            <h1>CertMailer</h1>
          </div>
          <div className="tab-switcher">
            <button
              className={`tab-button ${activeTab === 'setup' ? 'active' : ''}`}
              onClick={() => setActiveTab('setup')}
            >
              <Settings size={18} />
              Setup
            </button>
            <button
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              <CheckCircle size={18} />
              Results
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="setup-container"
            >
              <div className="machine-panel">
                {/* Left Panel - Controls */}
                <div className="control-panel">
                  <div className="section">
                    <h2>Template</h2>
                    <div className="upload-zone">
                      <input
                        type="file"
                        accept=".png,.pdf"
                        onChange={(e) => e.target.files && handleTemplateUpload(e.target.files[0])}
                        id="template-upload"
                        className="file-input"
                      />
                      <label htmlFor="template-upload" className="upload-label">
                        <Upload size={24} />
                        <span>{templateFile ? templateFile.name : 'Upload Template (PNG/PDF)'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="section">
                    <h2>Participants</h2>
                    <div className="upload-zone">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => e.target.files && handleExcelUpload(e.target.files[0])}
                        id="excel-upload"
                        className="file-input"
                      />
                      <label htmlFor="excel-upload" className="upload-label">
                        <Upload size={24} />
                        <span>{excelFile ? `${excelFile.name} (${participantCount} people)` : 'Upload Excel File'}</span>
                      </label>
                    </div>
                    {participantPreview.length > 0 && (
                      <>
                        <button 
                          onClick={() => setShowExcelPreview(!showExcelPreview)} 
                          className="btn btn-secondary preview-toggle"
                        >
                          {showExcelPreview ? 'Hide' : 'Show'} Preview ({participantCount} participants)
                        </button>
                        {showExcelPreview && (
                          <div className="preview-table">
                            {participantPreview.map((p, i) => (
                              <div key={i} className="preview-row">
                                <span>{p.Name}</span>
                                <span className="email">{p.Email}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="section">
                    <h2>Text Settings</h2>
                    <div className="form-group">
                      <label>Preview Text</label>
                      <input
                        type="text"
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        className="text-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Font</label>
                      <select
                        value={fontName}
                        onChange={(e) => setFontName(e.target.value)}
                        className="select-input"
                      >
                        {fonts.map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Font Size: {fontSize}px</label>
                      <input
                        type="range"
                        min="20"
                        max="150"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="slider"
                      />
                    </div>
                    <div className="form-row-group">
                      <div className="form-group">
                        <label>Y Position (Vertical)</label>
                        <div className="position-controls">
                          <div className="position-row">
                            <input
                              type="number"
                              value={textPosition.y}
                              onChange={(e) => setTextPosition({ ...textPosition, y: Number(e.target.value) })}
                              className="position-input"
                              min="0"
                              max={templateDimensions.height || 9999}
                            />
                            <span className="position-unit">px</span>
                          </div>
                          <small className="hint-text">Name will be centered horizontally</small>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Text Color</label>
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="color-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <h2>Email Settings</h2>
                    <div className="form-group">
                      <label>Gmail Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="text-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>App Password</label>
                      <input
                        type="password"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="text-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Subject</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Your Participation Certificate"
                        className="text-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Body (Complete Message)</label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Dear {name},&#10;&#10;Congratulations! Please find attached your participation certificate.&#10;&#10;Best regards,&#10;Your Organization"
                        className="textarea-input"
                        rows={8}
                      />
                      <small className="hint-text">Write the complete email content. Use {'{name}'} to insert recipient's name anywhere in the message.</small>
                    </div>
                  </div>

                  <div className="section">
                    <h2><MessageSquare size={16} /> Feedback Form</h2>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={feedbackEnabled}
                          onChange={(e) => setFeedbackEnabled(e.target.checked)}
                          className="checkbox-input"
                        />
                        <span>Require feedback before sending certificate</span>
                      </label>
                      <small className="hint-text">
                        {feedbackEnabled 
                          ? 'Participants will receive a feedback form link. Certificate is sent after form submission.'
                          : 'Certificates will be sent directly without feedback.'
                        }
                      </small>
                    </div>

                    {feedbackEnabled && (
                      <div className="feedback-questions">
                        <div className="feedback-questions-header">
                          <span className="feedback-count">{feedbackQuestions.length} questions</span>
                          <button onClick={addFeedbackQuestion} className="btn btn-small">
                            <Plus size={14} />
                            Add Question
                          </button>
                        </div>

                        {feedbackQuestions.map((q, index) => (
                          <div key={q.id} className="feedback-question-card">
                            <div className="question-header">
                              <span className="question-number">Q{index + 1}</span>
                              <button 
                                onClick={() => removeFeedbackQuestion(q.id)} 
                                className="btn-icon danger"
                                title="Remove question"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => updateFeedbackQuestion(q.id, { question: e.target.value })}
                              placeholder="Enter your question..."
                              className="text-input"
                            />
                            <div className="question-options">
                              <select
                                value={q.type}
                                onChange={(e) => updateFeedbackQuestion(q.id, { type: e.target.value as 'text' | 'rating' | 'multiple_choice' })}
                                className="select-input small"
                              >
                                <option value="text">Text Answer</option>
                                <option value="rating">Rating (1-5)</option>
                                <option value="multiple_choice">Multiple Choice</option>
                              </select>
                              <label className="checkbox-label small">
                                <input
                                  type="checkbox"
                                  checked={q.required}
                                  onChange={(e) => updateFeedbackQuestion(q.id, { required: e.target.checked })}
                                  className="checkbox-input"
                                />
                                <span>Required</span>
                              </label>
                            </div>
                            {q.type === 'multiple_choice' && (
                              <input
                                type="text"
                                value={q.options?.join(', ') || ''}
                                onChange={(e) => updateFeedbackQuestion(q.id, { options: e.target.value.split(',').map(o => o.trim()) })}
                                placeholder="Options (comma separated): Option 1, Option 2, Option 3"
                                className="text-input small"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="action-buttons">
                    <button onClick={() => handleValidate()} className="btn btn-secondary">
                      <CheckCircle size={20} />
                      Validate Settings
                    </button>
                    <button 
                      onClick={handleGenerate} 
                      className="btn btn-primary"
                      disabled={isProcessing || !templateFile || !excelFile || !email || !appPassword}
                    >
                      <Play size={20} />
                      Generate & Send
                    </button>
                  </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="preview-panel">
                  <h2>Live Preview</h2>
                  <p className="hint">Click on the template to set Y position (names are auto-centered)</p>
                  <div 
                    className="canvas-container"
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{ cursor: 'crosshair' }}
                  >
                    {templatePreview ? (
                      <img 
                        src={templatePreview} 
                        alt="Template Preview" 
                        className="template-image"
                      />
                    ) : (
                      <div className="empty-canvas">
                        <Upload size={48} />
                        <p>Upload a template to begin</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="results-container"
            >
              {isProcessing ? (
                <div className="processing-indicator">
                  <Loader className="spinner" size={64} />
                  <h2>Processing Certificates...</h2>
                  <p>Please wait while we generate and send the certificates</p>
                </div>
              ) : results ? (
                <div className="results-panel">
                  <div className="stats-grid">
                    <div className="stat-card total">
                      <div className="stat-icon">Total</div>
                      <div className="stat-value">{results.total}</div>
                      <div className="stat-label">Certificates</div>
                    </div>
                    <div className="stat-card success">
                      <div className="stat-icon">Success</div>
                      <div className="stat-value">{results.successful}</div>
                      <div className="stat-label">Sent</div>
                    </div>
                    <div className="stat-card failed">
                      <div className="stat-icon">Failed</div>
                      <div className="stat-value">{results.failed}</div>
                      <div className="stat-label">Errors</div>
                    </div>
                  </div>

                  <div className="details-section">
                    <div className="details-header">
                      <h3>Details</h3>
                      <button onClick={downloadResults} className="btn btn-secondary download-btn">
                        <Download size={18} />
                        Download Results
                      </button>
                    </div>
                    <div className="details-list">
                      {results.details.map((detail, index) => (
                        <div key={index} className={`detail-row ${detail.status}`}>
                          {detail.status === 'success' ? (
                            <CheckCircle size={20} className="status-icon success" />
                          ) : (
                            <XCircle size={20} className="status-icon failed" />
                          )}
                          <div className="detail-info">
                            <strong>{detail.name}</strong>
                            <span>{detail.email}</span>
                          </div>
                          {detail.error && (
                            <span className="error-message">{detail.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-results">
                  <Mail size={64} />
                  <h2>No Results Yet</h2>
                  <p>Configure settings and generate certificates to see results here</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
