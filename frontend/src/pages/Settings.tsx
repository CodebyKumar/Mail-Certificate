import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Key,
  Save,
  TestTube,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { usersApi } from '../api';
import './Settings.css';

interface EmailSettings {
  email: string;
  app_password: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<EmailSettings>({
    email: '',
    app_password: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await usersApi.getEmailSettings();
      if (response.data && response.data.configured) {
        setSettings({
          email: response.data.email || '',
          app_password: ''
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings.email || !settings.app_password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await usersApi.updateEmailSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to save settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.email) {
      setMessage({ type: 'error', text: 'Please save your settings first' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      await usersApi.testEmailConnection();
      setMessage({ type: 'success', text: 'Connection successful! Your email is configured correctly.' });
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Connection failed. Please check your credentials.' 
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Email Settings</h1>
          <p>Configure your Gmail credentials for sending certificates</p>
        </div>
      </div>

      <div className="settings-container">
        <div className="settings-card">
          <div className="card-header">
            <Mail size={24} />
            <div>
              <h2>Gmail Configuration</h2>
              <p>Set up your Gmail account to send certificates</p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {message && (
              <motion.div 
                className={`message ${message.type}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </motion.div>
            )}

            <div className="form-group">
              <label>
                <Mail size={16} />
                Gmail Address
              </label>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={settings.email}
                onChange={e => setSettings({ ...settings, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>
                <Key size={16} />
                App Password
              </label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your Gmail App Password"
                  value={settings.app_password}
                  onChange={e => setSettings({ ...settings, app_password: e.target.value })}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <motion.button
                type="submit"
                className="btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="spinner-small"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Settings
                  </>
                )}
              </motion.button>

              <motion.button
                type="button"
                className="btn-secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTest}
                disabled={testing || !settings.email}
              >
                {testing ? (
                  <>
                    <div className="spinner-small"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube size={18} />
                    Test Connection
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>

        <div className="help-card">
          <div className="help-header">
            <Shield size={24} />
            <h3>How to Get Gmail App Password</h3>
          </div>

          <div className="help-steps">
            <div className="step">
              <span className="step-number">1</span>
              <div>
                <h4>Enable 2-Factor Authentication</h4>
                <p>Go to your Google Account settings and enable 2FA</p>
              </div>
            </div>

            <div className="step">
              <span className="step-number">2</span>
              <div>
                <h4>Go to App Passwords</h4>
                <p>Navigate to Security → App passwords in your Google Account</p>
              </div>
            </div>

            <div className="step">
              <span className="step-number">3</span>
              <div>
                <h4>Create App Password</h4>
                <p>Select "Mail" and "Windows Computer", then generate</p>
              </div>
            </div>

            <div className="step">
              <span className="step-number">4</span>
              <div>
                <h4>Copy the Password</h4>
                <p>Copy the 16-character password and paste it above</p>
              </div>
            </div>
          </div>

          <a 
            href="https://myaccount.google.com/apppasswords" 
            target="_blank" 
            rel="noopener noreferrer"
            className="help-link"
          >
            <ExternalLink size={16} />
            Go to Google App Passwords
          </a>
        </div>
      </div>
    </div>
  );
}
