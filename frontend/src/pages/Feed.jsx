import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../utils/api';

export default function Feed() {
  const { user } = useAuth();
  const [posts,   setPosts]   = useState([]);
  const [filter,  setFilter]  = useState('recent');
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMedia, setShowMedia] = useState(false);

  const loadPosts = useCallback(async (f = filter, p = 1) => {
    setLoading(true);
    try {
      const data = await api.feed({ filter: f, page: p });
      setPosts(p === 1 ? data.posts : prev => [...prev, ...data.posts]);
    } catch(e) {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadPosts(filter, 1); setPage(1); }, [filter]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api.createPost({
        content,
        ...(mediaUrl ? { media_url: mediaUrl, media_type: 'image' } : {})
      });
      setContent('');
      setMediaUrl('');
      setShowMedia(false);
      loadPosts(filter, 1);
    } catch(err) {
      alert(err?.error || 'Erreur lors de la publication');
    }
    setPosting(false);
  };

  return (
    <div>
      {/* Composer */}
      <div className="composer">
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <Avatar user={user} size="md" />
          <form onSubmit={handlePost} style={{ flex: 1 }}>
            <textarea
              className="composer-input"
              placeholder="Quoi de neuf ?"
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handlePost(e); }}
            />
            {showMedia && (
              <input
                className="form-input"
                style={{ marginTop: 8 }}
                placeholder="URL de l'image…"
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
              />
            )}
            <div className="composer-actions">
              <div className="composer-tools">
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => setShowMedia(s => !s)}>
                  🖼️ Photo
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{content.length}/5000</span>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!content.trim() || posting || content.length > 5000}
                >
                  {posting ? '…' : 'Publier'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-tabs">
        {[
          { key: 'recent',    label: '🕐 Récent' },
          { key: 'following', label: '👥 Abonnements' },
          { key: 'trending',  label: '🔥 Tendances' },
        ].map(f => (
          <button key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading && page === 1 ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          {filter === 'following' ? 'Suivez des utilisateurs pour voir leurs publications ici.' : 'Aucune publication pour l\'instant.'}
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={id => setPosts(p => p.filter(x => x.id !== id))}
              onUpdate={(id, content) => setPosts(p => p.map(x => x.id === id ? { ...x, content } : x))}
            />
          ))}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => {
              const next = page + 1;
              setPage(next);
              loadPosts(filter, next);
            }}>Charger plus</button>
          </div>
        </>
      )}
    </div>
  );
}
