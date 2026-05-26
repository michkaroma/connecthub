// Notifications.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.notifications().then(d => setNotifications(d.notifications)).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await api.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, is_read: 1 })));
  };

  const markRead = async (id) => {
    await api.markRead(id);
    setNotifications(n => n.map(x => x.id == id ? { ...x, is_read: 1 } : x));
  };

  const ICONS = { like: '👍', comment: '💬', follow: '👤', mention: '@', share: '🔁', message: '✉️', community_join: '🏘️', community_invite: '📩', moderation: '🛡️', system: '⚙️' };

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Notifications</span>
        <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Tout marquer lu</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>🔔 Aucune notification</div>
      ) : (
        notifications.map(n => (
          <div key={n.id}
            onClick={() => !n.is_read && markRead(n.id)}
            style={{
              display: 'flex', gap: 12, padding: '14px 16px',
              background: n.is_read ? 'var(--bg-surface)' : 'var(--accent-dim)',
              border: '1px solid var(--border)',
              borderLeft: n.is_read ? '1px solid var(--border)' : '3px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 8, cursor: n.is_read ? 'default' : 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{ICONS[n.type] || '🔔'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem' }}>
                {n.actor_name && <strong>{n.actor_name} </strong>}
                {n.content}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                {new Date(n.created_at).toLocaleString('fr-FR')}
              </div>
            </div>
            {!n.is_read && <div className="notif-dot" style={{ marginTop: 6 }} />}
          </div>
        ))
      )}
    </div>
  );
}
