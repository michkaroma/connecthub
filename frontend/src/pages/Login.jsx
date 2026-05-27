import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
    } catch(err) {
      setError(err?.error || 'Identifiants invalides');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1 className="auth-hero-title">Connect<span>Hub</span></h1>
        <p className="auth-hero-sub">Votre communauté, vos conversations, votre espace.</p>
        <div style={{ marginTop: 40, display: 'grid', gap: 12, width: '100%', maxWidth: 300, position: 'relative' }}>
          {['Publications & médias','Communautés thématiques','Messagerie privée','Notifications en temps réel'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--accent-light)', fontSize: '1rem' }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <h2>Connexion</h2>
          <p>Bienvenue ! Connectez-vous pour continuer.</p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nom d'utilisateu ou email</label>
              <input className="form-input" type="text" value={identifier}
                onChange={e => setIdentifier(e.target.value)} required autoFocus
                placeholder="alice ou alice@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
              {loading ? '…' : 'Se connecter'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: 'var(--accent-light)', fontWeight: 600 }}>S'inscrire</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
