import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form,    setForm]    = useState({ username: '', email: '', display_name: '', password: '' });
  const [errors,  setErrors]  = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await register(form);
    } catch(err) {
      setErrors(err?.errors || [err?.error || 'Erreur lors de l\'inscription']);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1 className="auth-hero-title">Connect<span>Hub</span></h1>
        <p className="auth-hero-sub">Rejoignez notre communauté dès aujourd'hui.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <h2>Créer un compte</h2>
          <p>C'est rapide et gratuit.</p>

          {errors.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: '0.88rem' }}>
              {errors.map((err, i) => <div key={i} style={{ color: 'var(--danger)' }}>{err}</div>)}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nom d'utilisateur</label>
              <input className="form-input" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required autoFocus placeholder="alice_martin" pattern="[a-zA-Z0-9_]{3,50}" />
            </div>
            <div className="form-group">
              <label className="form-label">Nom affiché</label>
              <input className="form-input" value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                required placeholder="Alice Martin" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required placeholder="alice@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required placeholder="Min. 8 caractères" minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
              {loading ? '…' : 'Créer mon compte'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
