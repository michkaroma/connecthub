import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import './styles/global.css';

// Lazy-loaded pages for performance
const Feed         = lazy(() => import('./pages/Feed'));
const Profile      = lazy(() => import('./pages/Profile'));
const Communities  = lazy(() => import('./pages/Communities'));
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'));
const Messages     = lazy(() => import('./pages/Messages'));
const Notifications= lazy(() => import('./pages/Notifications'));
const Moderation   = lazy(() => import('./pages/Moderation'));
const Search       = lazy(() => import('./pages/Search'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function ModRoute({ children }) {
  const { isModerator, loading } = useAuth();
  if (loading) return null;
  return isModerator ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
      <Routes>
        <Route path="/login"    element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/"                          element={<Feed />} />
          <Route path="/profile/:id"               element={<Profile />} />
          <Route path="/communities"               element={<Communities />} />
          <Route path="/communities/:id"           element={<CommunityDetail />} />
          <Route path="/messages"                  element={<Messages />} />
          <Route path="/messages/:id"              element={<Messages />} />
          <Route path="/notifications"             element={<Notifications />} />
          <Route path="/search"                    element={<Search />} />
          <Route path="/moderation"                element={<ModRoute><Moderation /></ModRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
