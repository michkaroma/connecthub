import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Moderation() {
  const [reports, setReports] = useState([]);
  const [status,  setStatus]  = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getReports(status).then(d => setReports(d.reports)).finally(() => setLoading(false));
  }, [status]);

  const handleAction = async (id, newStatus) => {
    try {
      await api.updateReport(id, newStatus);
      setReports(r => r.filter(x => x.id !== id));
    } catch(err) { alert(err?.error || 'Erreur'); }
  };

  const REASON_LABELS = {
    spam: '🔁 Spam',
    harassment: '😡 Harcèlement',
    hate_speech: '☢️ Discours haineux',
    misinformation: '❌ Désinformation',
    other: '❓ Autre'
  };

  return (
    <div>
      <div className="section-header">
        <span className="section-title">🛡️ Modération</span>
      </div>

      <div className="filter-tabs" style={{ maxWidth: 500, marginBottom: 20 }}>
        {['pending','reviewed','resolved','dismissed'].map(s => (
          <button key={s} className={`filter-tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
            {{ pending: 'En attente', reviewed: 'Examinés', resolved: 'Résolus', dismissed: 'Ignorés' }[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          ✅ Aucun signalement {status === 'pending' ? 'en attente' : ''}
        </div>
      ) : (
        reports.map(r => (
          <div key={r.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {REASON_LABELS[r.reason] || r.reason}
                  </span>
                  <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem' }}>
                    {r.target_type} #{r.target_id}
                  </span>
                </div>
                {r.description && <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{r.description}</p>}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Signalé par @{r.reporter_username} • {new Date(r.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              {status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}
                    onClick={() => handleAction(r.id, 'resolved')}>
                    ✓ Résoudre
                  </button>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => handleAction(r.id, 'dismissed')}>
                    ✕ Ignorer
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
