import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Award, Mail, Lock, User, Loader, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="auth-header">
          <Award className="auth-logo" size={48} />
          <h1>CertMailer</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-field">
            <label>Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <Loader className="spinner" size={20} />
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
          <p className="admin-link">
            <Link to="/admin/login">Admin Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="auth-header">
          <Award className="auth-logo" size={48} />
          <h1>CertMailer</h1>
          <p>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-field">
            <label>Full Name</label>
            <div className="auth-input-wrapper">
              <User size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Confirm Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <Loader className="spinner" size={20} />
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminLogin(email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-auth">
      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="auth-header">
          <Award className="auth-logo admin" size={48} />
          <h1>Admin Panel</h1>
          <p>Restricted access</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-field">
            <label>Admin Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit admin" disabled={loading}>
            {loading ? (
              <Loader className="spinner" size={20} />
            ) : (
              <>
                Admin Login
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login">← Back to User Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Main Auth Page component that handles both login and signup
export function AuthPage() {
  const location = useLocation();
  const isSignup = location.pathname.includes('register') || location.pathname.includes('signup');
  
  if (isSignup) {
    return <Signup />;
  }
  return <Login />;
}

// Admin Login Page export
export function AdminLoginPage() {
  return <AdminLogin />;
}
