import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import api from '../utils/api';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query,   setQuery]   = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [type,    setType]    = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      doSearch(q, type);
    }
  }, [searchParams]);

  const doSearch = async (q, t) => {
    if (!q || q.length < 2) return;
    setLoading(true);
    try {
      const data = await api.search(q, t);
      setResults(data);
    } catch(e) {}
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    doSearch(query, type);
  };

  return (
    <div>
      <div className="section-header"><span className="section-title">Recherche</span></div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div className="search-bar" style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" width="18" height="18">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            autoFocus
            placeholder="Rechercher des personnes, publications, communautés…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ fontSize: '1rem' }}
          />
          <button type="submit" className="btn btn-primary btn-sm">Chercher</button>
        </div>
      </form>

      {/* Type filter */}
      <div className="filter-tabs" style={{ maxWidth: 500, marginBottom: 24 }}>
        {['all','users','posts','communities'].map(t => (
          <button key={t} className={`filter-tab ${type === t ? 'active' : ''}`}
            onClick={() => { setType(t); if (query) doSearch(query, t); }}>
            {{ all: 'Tout', users: 'Personnes', posts: 'Publications', communities: 'Communautés' }[t]}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}

      {results && !loading && (
        <>
          {/* Users */}
          {results.users?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="section-header"><span className="section-title">Personnes</span></div>
              {results.users.map(u => (
                <Link to={`/profile/${u.id}`} key={u.id} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar user={u} size="md" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      {u.bio && <div style={{ fontSize: '0.82rem', marginTop: 2 }}>{u.bio}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Communities */}
          {results.communities?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="section-header"><span className="section-title">Communautés</span></div>
              {results.communities.map(c => (
                <Link to={`/communities/${c.id}`} key={c.id} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0 }}>{c.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.member_count} membres</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Posts */}
          {results.posts?.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title">Publications</span></div>
              {results.posts.map(p => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}

          {/* Hashtags */}
          {results.hashtags?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="section-header"><span className="section-title">Hashtags</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {results.hashtags.map(h => (
                  <button key={h.tag} className="btn btn-secondary btn-sm"
                    onClick={() => { setQuery(h.tag); setSearchParams({ q: h.tag }); doSearch(h.tag, type); }}>
                    #{h.tag} <span style={{ opacity: 0.6 }}>({h.post_count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!results.users?.length && !results.posts?.length && !results.communities?.length && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Aucun résultat pour « {query} »</div>
          )}
        </>
      )}

      {!results && !loading && (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
          Tapez quelque chose pour commencer
        </div>
      )}
    </div>
  );
}
