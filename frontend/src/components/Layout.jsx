import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Avatar from './Avatar';

const HomeIcon     = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const SearchIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const CommIcon     = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const MsgIcon      = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>;
const BellIcon     = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>;
const ModIcon      = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>;
const PeopleIcon   = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;

export default function Layout() {
  const { user, logout, isModerator } = useAuth();
  const navigate = useNavigate();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    api.notifications()
      .then(d => setUnreadNotifs(d.unread_count || 0))
      .catch(() => {});
    const interval = setInterval(() => {
      api.notifications()
        .then(d => setUnreadNotifs(d.unread_count || 0))
        .catch(() => {});
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <NavLink to="/" className="logo">Connect<span>Hub</span></NavLink>
        <form onSubmit={handleSearch} className="search-bar" style={{ maxWidth: 400 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Rechercher…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
        </form>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavLink to={`/profile/${user?.id}`}>
            <Avatar user={user} size="sm" />
          </NavLink>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="app-sidebar">
        <NavLink to="/"             className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><HomeIcon />Fil d'actualité</NavLink>
        <NavLink to="/search"       className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><SearchIcon />Découvrir</NavLink>
        <NavLink to="/communities"  className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><CommIcon />Communautés</NavLink>
        <NavLink to="/messages"     className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><MsgIcon />Messages</NavLink>
        <NavLink to="/notifications" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <BellIcon />Notifications
          {unreadNotifs > 0 && <span className="nav-badge">{unreadNotifs}</span>}
        </NavLink>
        <NavLink to={`/profile/${user?.id}`} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><PeopleIcon />Mon profil</NavLink>
        {isModerator && (
          <NavLink to="/moderation" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><ModIcon />Modération</NavLink>
        )}
      </nav>

      {/* Main content */}
      <main className="app-main">
        <Outlet />
      </main>

    </div>
  );
}
