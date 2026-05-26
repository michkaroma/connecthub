import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../utils/api';

export default function CommunityDetail() {
  const { id } = useParams();
  const { user, isModerator } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [content,   setContent]   = useState('');
  const [tab,       setTab]       = useState('posts'); // posts | members

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getCommunity(id),
      api.feed({ community: id })
    ]).then(([comm, feed]) => {
      setCommunity(comm);
      setPosts(feed.posts);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    try {
      if (community.user_role) {
        await api.leaveCommunity(id);
        setCommunity(c => ({ ...c, user_role: null, member_count: c.member_count - 1 }));
      } else {
        await api.joinCommunity(id);
        setCommunity(c => ({ ...c, user_role: 'member', member_count: c.member_count + 1 }));
      }
    } catch(err) { alert(err?.error || 'Erreur'); }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await api.createPost({ content, community_id: parseInt(id) });
      setContent('');
      const feed = await api.feed({ community: id });
      setPosts(feed.posts);
    } catch(err) { alert(err?.error || 'Erreur'); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateMemberRole(id, userId, newRole);
      setCommunity(c => ({
        ...c,
        members: c.members.map(m => m.id == userId ? { ...m, role: newRole } : m)
      }));
    } catch(err) { alert(err?.error); }
  };

  const handleDeleteCommunity = async () => {
    if (!window.confirm('Supprimer définitivement cette communauté ?')) return;
    await api.deleteCommunity(id);
    window.location.href = '/communities';
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!community) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Communauté introuvable.</div>;

  const myRole = community.user_role;
  const isAdmin = myRole === 'admin';
  const isMod   = myRole === 'moderator' || isAdmin;

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
            {community.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem' }}>{community.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>{community.description}</p>
            <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              👥 {community.member_count} membres • créée par @{community.creator_username}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isAdmin && (
              <button className={`btn btn-sm ${myRole ? 'btn-secondary' : 'btn-primary'}`} onClick={handleJoin}>
                {myRole ? 'Quitter' : 'Rejoindre'}
              </button>
            )}
            {(isModerator && isMod) && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteCommunity}>🗑️</button>
            )}
          </div>
        </div>
        {myRole && (
          <div style={{ marginTop: 8 }}>
            <span style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600 }}>
              {myRole}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="filter-tabs" style={{ maxWidth: 300 }}>
        <button className={`filter-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>Publications</button>
        <button className={`filter-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Membres ({community.member_count})</button>
      </div>

      {tab === 'posts' && (
        <>
          {myRole && (
            <div className="composer" style={{ marginBottom: 16 }}>
              <form onSubmit={handlePost} style={{ display: 'flex', gap: 10 }}>
                <Avatar user={user} size="md" />
                <div style={{ flex: 1 }}>
                  <textarea className="composer-input" placeholder={`Publier dans ${community.name}…`}
                    value={content} onChange={e => setContent(e.target.value)} />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={!content.trim()}>Publier</button>
                </div>
              </form>
            </div>
          )}
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {myRole ? 'Soyez le premier à publier !' : 'Rejoignez la communauté pour voir les publications.'}
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post}
                onDelete={pid => setPosts(p => p.filter(x => x.id !== pid))} />
            ))
          )}
        </>
      )}

      {tab === 'members' && (
        <div>
          {community.members?.map(m => (
            <div key={m.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar user={m} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.display_name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{m.username}</div>
              </div>
              <span style={{ fontSize: '0.78rem', color: m.role === 'admin' ? 'var(--accent-light)' : m.role === 'moderator' ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                {m.role}
              </span>
              {isAdmin && m.id != user?.id && (
                <select
                  value={m.role}
                  onChange={e => handleRoleChange(m.id, e.target.value)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  <option value="member">Membre</option>
                  <option value="moderator">Modérateur</option>
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
