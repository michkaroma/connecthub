// Communities.jsx - List page
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function Communities() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [form, setForm]               = useState({ name: '', description: '' });

  useEffect(() => {
    api.communities().then(d => setCommunities(d.communities)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const d = await api.createCommunity(form);
      window.location.href = `/communities/${d.id}`;
    } catch(err) {
      alert(err?.error || 'Erreur');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Communautés</span>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(c => !c)}>+ Créer</button>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de la communauté" required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description…" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">Créer</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {communities.map(c => (
        <Link to={`/communities/${c.id}`} key={c.id} style={{ textDecoration: 'none', display: 'block' }}>
          <div className="card" style={{ marginBottom: 12, cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-light)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                {c.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{c.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                  👥 {c.member_count} membre{c.member_count > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
