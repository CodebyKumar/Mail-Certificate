import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

// Auth
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Pages
import { AuthPage, AdminLoginPage } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Participants from './pages/Participants'
import Settings from './pages/Settings'
import SendPage from './pages/Send'
import Admin from './pages/Admin'
import FeedbackForm from './FeedbackForm'

// CSS imports for components
import './components/Layout.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/feedback/:token" element={<FeedbackForm />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/new" element={<Events />} />
              <Route path="/events/:eventId" element={<Events />} />
              <Route path="/events/:eventId/participants" element={<Participants />} />
              <Route path="/events/:eventId/send" element={<SendPage />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          
          {/* Admin routes */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
          
          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
