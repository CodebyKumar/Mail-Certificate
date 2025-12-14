import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, usersApi } from '../api';

interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  has_email_settings: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const saveAuth = (tokenData: string, userData: User) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { access_token, user: userData } = response.data;
    saveAuth(access_token, userData);
  };

  const adminLogin = async (email: string, password: string) => {
    // Same as regular login, backend validates admin status
    const response = await authApi.login({ email, password });
    const { access_token, user: userData } = response.data;
    if (!userData.is_admin) {
      throw new Error('Not authorized as admin');
    }
    saveAuth(access_token, userData);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await authApi.register({ name, email, password });
    const { access_token, user: userData } = response.data;
    saveAuth(access_token, userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await usersApi.getProfile();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.is_admin || false,
        login,
        adminLogin,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
