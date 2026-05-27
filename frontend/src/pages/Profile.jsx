import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import api from '../utils/api';

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  const isMe = user?.id == id;

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getUser(id), api.userPosts(id)])
      .then(([profileData, postsData]) => {
        setProfile(profileData);
        setPosts(postsData.posts);
        setForm({ display_name: profileData.display_name, bio: profileData.bio || '' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    if (profile.is_following) {
      await api.unfollow(id);
      setProfile(p => ({ ...p, is_following: false, followers_count: p.followers_count - 1 }));
    } else {
      await api.follow(id);
      setProfile(p => ({ ...p, is_following: true, followers_count: p.followers_count + 1 }));
    }
  };

  const handleSave = async () => {
    await api.updateUser(id, form);
    setProfile(p => ({ ...p, ...form }));
    setEditMode(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!profile) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Utilisateur introuvable.</div>;

  return (
    <div>
      {/* Cover + Avatar */}
      <div style={{
        height: 180,
        background: 'linear-gradient(135deg, var(--accent-dim), var(--bg-elevated))',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 60,
        position: 'relative'
      }}>
        {profile.cover_url && <img src={profile.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />}
        <div style={{ position: 'absolute', bottom: -50, left: 20 }}>
          <Avatar user={profile} size="xl" style={{ border: '4px solid var(--bg-base)' }} />
        </div>
      </div>

      {/* Profile info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {editMode ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Nom affiché</label>
                  <input className="form-input" value={form.display_name}
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-input" value={form.bio} rows={3}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>Enregistrer</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem' }}>
                  {profile.display_name}
                  {!!profile.is_verified && <span title="Vérifié" style={{ marginLeft: 6, color: 'var(--accent)' }}>✓</span>}
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 8 }}>@{profile.username}</div>
                {profile.bio && <p style={{ fontSize: '0.93rem', maxWidth: 480 }}>{profile.bio}</p>}
                <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: '0.88rem' }}>
                  <span><strong>{profile.posts_count}</strong> <span style={{ color: 'var(--text-muted)' }}>publications</span></span>
                  <span><strong>{profile.followers_count}</strong> <span style={{ color: 'var(--text-muted)' }}>abonnés</span></span>
                  <span><strong>{profile.following_count}</strong> <span style={{ color: 'var(--text-muted)' }}>abonnements</span></span>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isMe ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(e => !e)}>✏️ Modifier</button>
            ) : (
              <button className={`btn btn-sm ${profile.is_following ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
                {profile.is_following ? 'Se désabonner' : 'Suivre'}
              </button>
            )}
          </div>
        </div>
        {profile.role !== 'user' && (
          <div style={{ marginTop: 10 }}>
            <span style={{
              background: 'var(--accent-dim)', color: 'var(--accent-light)',
              padding: '2px 10px', borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase'
            }}>{profile.role}</span>
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="section-header">
        <span className="section-title">Publications</span>
      </div>
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune publication.</div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post}
            onDelete={pid => setPosts(p => p.filter(x => x.id !== pid))}
          />
        ))
      )}
    </div>
  );
}
