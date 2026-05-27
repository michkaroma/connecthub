import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../utils/api';

const EMOJIS = ['👍','❤️','😂','😮','😢','🎉'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'À l\'instant';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function renderContent(text) {
  return text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
             .replace(/@(\w+)/g, '<a href="/profile/$1" class="hashtag">@$1</a>');
}

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user, isModerator } = useAuth();
  const [reactions, setReactions]         = useState(parseInt(post.reaction_count) || 0);
  const [comments,  setComments]          = useState(parseInt(post.comment_count)  || 0);
  const [shareCount, setShareCount]       = useState(parseInt(post.share_count)    || 0);
  const [userReaction, setUserReaction]   = useState(post.user_reaction || null);
  const [showEmojis,  setShowEmojis]      = useState(false);
  const [showComments, setShowComments]   = useState(false);
  const [commentList, setCommentList]     = useState([]);
  const [newComment,  setNewComment]      = useState('');
  const [editing, setEditing]             = useState(false);
  const [editContent, setEditContent]     = useState(post.content);
  const [shared, setShared]               = useState(!!post.user_shared);
  const [followingAuthor, setFollowingAuthor] = useState(!!post.is_following_author);

  const emojiRef = useRef(null);
  const isOwner = user?.id == post.author_id;

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojis) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojis(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojis]);

  const handleReact = async (emoji) => {
    setShowEmojis(false);
    try {
      if (userReaction === emoji) {
        // Same emoji clicked → remove reaction
        await api.unreact({ target_type: 'post', target_id: post.id });
        setReactions(r => r - 1);
        setUserReaction(null);
      } else if (userReaction) {
        // Different emoji → change reaction (count unchanged)
        await api.react({ target_type: 'post', target_id: post.id, emoji });
        setUserReaction(emoji);
      } else {
        // No reaction yet → add
        await api.react({ target_type: 'post', target_id: post.id, emoji });
        setReactions(r => r + 1);
        setUserReaction(emoji);
      }
    } catch(e) {}
  };

  const loadComments = async () => {
    if (!showComments) {
      try {
        const d = await api.postComments(post.id);
        setCommentList(d.comments);
      } catch(e) {}
    }
    setShowComments(s => !s);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.createComment({ post_id: post.id, content: newComment });
      setComments(c => c + 1);
      const d = await api.postComments(post.id);
      setCommentList(d.comments);
      setNewComment('');
    } catch(e) {}
  };

  const handleShare = async () => {
    if (shared) return;
    try {
      await api.sharePost(post.id);
      setShared(true);
      setShareCount(c => c + 1);
    } catch(e) {}
  };

  const handleFollowAuthor = async () => {
    if (!user) return;
    try {
      if (followingAuthor) {
        await api.unfollow(post.author_id);
        setFollowingAuthor(false);
      } else {
        await api.follow(post.author_id);
        setFollowingAuthor(true);
      }
    } catch(e) {}
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette publication ?')) return;
    try { await api.deletePost(post.id); onDelete?.(post.id); } catch(e) {}
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await api.updatePost(post.id, { content: editContent });
      setEditing(false);
      onUpdate?.(post.id, editContent);
    } catch(e) {}
  };

  return (
    <article className="post-card fade-in">
      {/* Header */}
      <div className="post-header">
        <Link to={`/profile/${post.author_id}`}>
          <Avatar user={{ username: post.username, display_name: post.display_name, avatar_url: post.avatar_url }} size="md" />
        </Link>
        <div className="post-meta">
          <div>
            <Link to={`/profile/${post.author_id}`} className="post-author-name">{post.display_name}</Link>
            {post.community_name && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {' '}→{' '}
                <Link to={`/communities/${post.community_id}`} style={{ color: 'var(--accent-light)' }}>
                  {post.community_name}
                </Link>
              </span>
            )}
          </div>
          <div className="post-time">{timeAgo(post.created_at)}</div>
        </div>

        {/* Follow button for non-owners */}
        {user && !isOwner && (
          <button
            className={`btn btn-sm ${followingAuthor ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.76rem', padding: '4px 10px', marginLeft: 'auto' }}
            onClick={handleFollowAuthor}
          >
            {followingAuthor ? 'Abonné(e)' : '+ Suivre'}
          </button>
        )}

        {/* Actions (owner / mod) */}
        {(isOwner || isModerator) && (
          <div style={{ position: 'relative', marginLeft: user && !isOwner ? 4 : 'auto' }}>
            <PostMenu
              canEdit={isOwner}
              onEdit={() => setEditing(true)}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div>
          <textarea
            className="composer-input"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>Enregistrer</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="post-content" dangerouslySetInnerHTML={{ __html: renderContent(post.content) }} />
      )}

      {post.media_url && post.media_type === 'image' && (
        <img src={post.media_url} alt="" className="post-image" />
      )}

      {/* Actions */}
      <div className="post-actions">
        {/* Reaction */}
        <div ref={emojiRef} style={{ position: 'relative' }}>
          <button
            className={`action-btn ${userReaction ? 'liked' : ''}`}
            onClick={() => user ? setShowEmojis(s => !s) : null}
            title={userReaction ? `Votre réaction : ${userReaction} — cliquez pour changer` : 'Réagir'}
          >
            {userReaction || '👍'} {reactions > 0 && reactions}
          </button>
          {showEmojis && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '6px',
              display: 'flex', gap: 4, zIndex: 10, boxShadow: 'var(--shadow-md)'
            }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => handleReact(e)}
                  style={{
                    fontSize: '1.2rem', padding: '4px', borderRadius: 4,
                    transition: 'transform 0.1s',
                    outline: userReaction === e ? '2px solid var(--accent)' : 'none'
                  }}
                  onMouseEnter={ev => ev.currentTarget.style.transform = 'scale(1.3)'}
                  onMouseLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
                  title={userReaction === e ? 'Retirer la réaction' : ''}
                >{e}</button>
              ))}
            </div>
          )}
        </div>

        <button className={`action-btn ${showComments ? 'active' : ''}`} onClick={loadComments}>
          💬 {comments > 0 && comments}
        </button>

        <button
          className={`action-btn ${shared ? 'active' : ''}`}
          onClick={handleShare}
          title={shared ? 'Publication partagée' : 'Partager'}
        >
          🔁 {shareCount > 0 && shareCount}
        </button>

        {/* Report */}
        {!isOwner && user && (
          <button className="action-btn" style={{ marginLeft: 'auto' }}
            onClick={() => {
              const reason = window.prompt('Raison (spam, harassment, hate_speech, misinformation, other):');
              if (reason) api.report({ target_type: 'post', target_id: post.id, reason }).catch(() => {});
            }}>
            ⚑
          </button>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {commentList.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 10 }}>
              Aucun commentaire. Soyez le premier !
            </p>
          )}
          {commentList.map(c => (
            <CommentItem key={c.id} comment={c} postId={post.id}
              onDelete={(cid) => {
                setCommentList(l => l.filter(x => x.id !== cid));
                setComments(c => Math.max(0, c - 1));
              }} />
          ))}
          {user && (
            <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Avatar user={user} size="xs" />
              <input
                className="form-input"
                style={{ flex: 1, padding: '7px 12px', fontSize: '0.88rem' }}
                placeholder="Écrire un commentaire…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Envoyer</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

function PostMenu({ canEdit, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="btn-ghost btn-icon" onClick={() => setOpen(o => !o)} style={{ padding: 4, color: 'var(--text-muted)' }}>•••</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 8, zIndex: 20,
          minWidth: 140, boxShadow: 'var(--shadow-md)'
        }}>
          {canEdit && <button className="nav-link" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setOpen(false); onEdit(); }}>✏️ Modifier</button>}
          <button className="nav-link" style={{ width: '100%', color: 'var(--danger)', justifyContent: 'flex-start' }} onClick={() => { setOpen(false); onDelete(); }}>🗑️ Supprimer</button>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, postId, onDelete }) {
  const { user, isModerator } = useAuth();
  const isOwner = user?.id == comment.author_id;
  const [editing, setEditing]             = useState(false);
  const [content, setContent]             = useState(comment.content);
  const [reactionCount, setReactionCount] = useState(parseInt(comment.reaction_count) || 0);
  const [userReaction, setUserReaction]   = useState(comment.user_reaction || null);
  const [showPicker, setShowPicker]       = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleReact = async (emoji) => {
    setShowPicker(false);
    if (!user) return;
    try {
      if (userReaction === emoji) {
        await api.unreact({ target_type: 'comment', target_id: comment.id });
        setReactionCount(r => r - 1);
        setUserReaction(null);
      } else if (userReaction) {
        await api.react({ target_type: 'comment', target_id: comment.id, emoji });
        setUserReaction(emoji);
      } else {
        await api.react({ target_type: 'comment', target_id: comment.id, emoji });
        setReactionCount(r => r + 1);
        setUserReaction(emoji);
      }
    } catch(e) {}
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    await api.deleteComment(comment.id);
    onDelete(comment.id);
  };

  const handleSave = async () => {
    await api.updateComment(comment.id, { content });
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      <Link to={`/profile/${comment.author_id}`}>
        <Avatar user={{ username: comment.username, display_name: comment.display_name, avatar_url: comment.avatar_url }} size="xs" />
      </Link>
      <div style={{ flex: 1 }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem', marginRight: 6 }}>{comment.display_name}</span>
          {editing ? (
            <div style={{ marginTop: 4 }}>
              <textarea
                className="form-input"
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ fontSize: '0.88rem', width: '100%', minHeight: 60 }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>OK</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Annuler</button>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.9rem' }}>{content}</span>
          )}
        </div>

        {/* Comment actions row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: '0.76rem', color: 'var(--text-muted)', alignItems: 'center' }}>
          <span>{comment.created_at && new Date(comment.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>

          {/* Reaction button */}
          {user && (
            <div ref={pickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPicker(s => !s)}
                style={{
                  cursor: 'pointer', background: 'none', border: 'none',
                  fontSize: '0.76rem', color: userReaction ? 'var(--accent-light)' : 'var(--text-muted)',
                  fontWeight: userReaction ? 600 : 400, padding: 0
                }}
              >
                {userReaction || '👍'} J'aime{reactionCount > 0 ? ` (${reactionCount})` : ''}
              </button>
              {showPicker && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '6px',
                  display: 'flex', gap: 4, zIndex: 30, boxShadow: 'var(--shadow-md)'
                }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => handleReact(e)}
                      style={{
                        fontSize: '1.1rem', padding: '3px', borderRadius: 4,
                        transition: 'transform 0.1s',
                        outline: userReaction === e ? '2px solid var(--accent)' : 'none'
                      }}
                      onMouseEnter={ev => ev.currentTarget.style.transform = 'scale(1.3)'}
                      onMouseLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
                    >{e}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!user && reactionCount > 0 && <span>{reactionCount} réactions</span>}

          {(isOwner || isModerator) && <>
            {isOwner && <button onClick={() => setEditing(true)} style={{ color: 'var(--accent-light)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.76rem' }}>Modifier</button>}
            <button onClick={handleDelete} style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.76rem' }}>Supprimer</button>
          </>}
        </div>
      </div>
    </div>
  );
}
