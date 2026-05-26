import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ch_token');
    if (token) {
      api.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('ch_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await api.login(identifier, password);
    localStorage.setItem('ch_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await api.register(formData);
    localStorage.setItem('ch_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ch_token');
    setUser(null);
  }, []);

  const isAdmin     = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isModerator }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
