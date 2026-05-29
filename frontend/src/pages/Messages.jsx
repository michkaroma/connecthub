import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import api from '../utils/api';

export default function Messages() {
  const { id: convId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations,  setConversations]   = useState([]);
  const [messages,       setMessages]        = useState([]);
  const [activeConv,     setActiveConv]      = useState(null);
  const [newMsg,         setNewMsg]          = useState('');
  const [loading,        setLoading]         = useState(true);
  const [newConvUser,    setNewConvUser]     = useState('');
  const [showNewConv,    setShowNewConv]     = useState(false);
  const [newConvIs,      setNewConvIs]       = useState(0);       //1->conversation  2->groupe
  const [numberInGroup,  setNumberInGroup]   = useState(3);
  const [newGroupUser,   setNewGroupUser]    = useState([])
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.conversations().then(d => {
      setConversations(d.conversations);
      if (convId) {
        const c = d.conversations.find(x => x.id == convId);
        if (c) loadMessages(c);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => {
      api.getMessages(activeConv.id).then(d => setMessages(d.messages)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConv]);

  const loadMessages = async (conv) => {
    setActiveConv(conv);
    navigate(`/messages/${conv.id}`);
    try {
      const d = await api.getMessages(conv.id);
      setMessages(d.messages);
    } catch(e) {}
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv) return;
    const text = newMsg;
    setNewMsg('');
    try {
      await api.sendMessage(activeConv.id, text);
      const d = await api.getMessages(activeConv.id);
      setMessages(d.messages);
    } catch(err) { alert(err?.error || 'Erreur'); }
  };

  const startDM = async () => {
    if (!newConvUser.trim()) return;
    // Search for user
    try {
      const results = await api.search(newConvUser, 'users');
      const found = results.users?.[0];
      if (!found) { alert('Utilisateur introuvable'); return; }
      const d = await api.createConv({ participants: [found.id] });
      const updatedConvs = await api.conversations();
      setConversations(updatedConvs.conversations);
      const newC = updatedConvs.conversations.find(c => c.id == d.id);
      if (newC) loadMessages(newC);
      setShowNewConv(false);
      setNewConvUser('');
      setNewConvIs(0);
    } catch(err) { alert(err?.error || 'Erreur'); }
  };

  const startGroup = async () => {
    for (let i=0;i<numberInGroup-1;i++){
      if (!newGroupUser[i]?.trim()) { alert(`Le champ d'utilisateur ${i+1} est vide`); return;}
    }
    try{
      const ids=[];
      for (let i = 0;i<numberInGroup-1;i++){
        const results = await api.search(newGroupUser[i], 'users');
        const found = results.users?.[0];
        if(!found){alert(`L'utilisateur ${newGroupUser[i]} est introuvable`); return;}
        ids.push(found.id);
      }

      const d = await api.createConv({participants: ids, is_group: true});
      const updatedConvs = await api.conversations();
      setConversations(updatedConvs.conversations);
      const newC = updatedConvs.conversations.find(c=> c.id == d.id);
      if (newC) loadMessages(newC);
      setShowNewConv(false);
      setNewGroupUser([]);
      setNumberInGroup(3);
      setNewConvIs(0);
    }catch(err) { alert(err?.error || 'Erreur'); }
  };

  const getConvName = (conv) => {
    if (conv.name) return conv.name;
    if (conv.other_user) return conv.other_user.display_name;
    return 'Conversation';
  };

  const getConvAvatar = (conv) => {
    if (conv.other_user) return conv.other_user;
    return null;
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--header-h) - 48px)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Left: conversation list */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Messages</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewConv(s => !s)}>+</button>
        </div>

        {showNewConv && (
          (newConvIs==0 && (
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)'}}>
              <button className="btn btn-primary btn-sm" onClick={() => setNewConvIs(1)}>Nouvelle conversation</button>
              <button className="btn btn-primary btn-sm" onClick={() => setNewConvIs(2)}>Nouveau Groupe</button>
            </div>
          )) || (newConvIs==1 && ( //conversation
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <input className="form-input" placeholder="Nom d'utilisateur…" value={newConvUser}
                onChange={e => setNewConvUser(e.target.value)} style={{ marginBottom: 8 }}
                onKeyDown={e => { if (e.key === 'Enter') { startDM(); } }} />
              <section style={{display: 'flex'}}>
                <button className="btn btn-primary btn-sm" onClick={() => setNewConvIs(0)}>retour</button>
                <button className="btn btn-primary btn-sm" onClick={startDM}>Nouvelle conversation</button>
              </section>
            </div>
          )) || (newConvIs==2 && ( //groupe
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              {Array.from({length: numberInGroup - 1},(_,i) => (
                <input 
                  key={i} 
                  className="form-input" 
                  placeholder={`Utilisateur ${i +1}...`} 
                  value={newGroupUser[i] || ''}
                  onChange={e => {
                    const updated = [...newGroupUser];
                    updated[i] = e.target.value;
                    setNewGroupUser(updated);
                  }} 
                  style={{ marginBottom: 8 }}
                />
              ))}
              <section style={{display: 'flex'}}>
                ({numberInGroup<8} && (<button className="btn btn-primary btn-sm" onClick={()=>setNumberInGroup(numberInGroup+1)}>+</button>))
                ({numberInGroup>2} && (<button className="btn btn-primary btn-sm" onClick={()=>setNumberInGroup(numberInGroup-1)}>-</button>))
              </section>
              <section style={{display: 'flex'}}>
                <button className="btn btn-primary btn-sm" onClick={() => setNewConvIs(0)}>retour</button>
                <button className="btn btn-primary btn-sm" onClick={startGroup}>Nouveau groupe</button>
              </section>
            </div>
          ))
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Aucune conversation</div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id}
                onClick={() => loadMessages(conv)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 16px',
                  cursor: 'pointer',
                  background: activeConv?.id === conv.id ? 'var(--accent-dim)' : 'transparent',
                  borderLeft: activeConv?.id === conv.id ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.15s'
                }}
              >
                <Avatar user={getConvAvatar(conv)} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getConvName(conv)}</span>
                    {conv.unread_count > 0 && <span className="nav-badge">{conv.unread_count}</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {conv.last_message || 'Pas encore de message'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: messages */}
      {activeConv ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar user={getConvAvatar(activeConv)} size="sm" />
            <div>
              <div style={{ fontWeight: 700 }}>{getConvName(activeConv)}</div>
              {activeConv.is_group && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{activeConv.participants?.length} participants</div>}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`msg-row ${msg.sender_id == user?.id ? 'mine' : ''}`}>
                {msg.sender_id != user?.id && (
                  <Avatar user={{ username: msg.username, display_name: msg.display_name, avatar_url: msg.avatar_url }} size="xs" />
                )}
                <div>
                  {msg.sender_id != user?.id && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{msg.display_name}</div>
                  )}
                  <div className={`msg-bubble ${msg.sender_id == user?.id ? 'mine' : 'theirs'}`}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, textAlign: msg.sender_id == user?.id ? 'right' : 'left' }}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              placeholder="Écrire un message…"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={!newMsg.trim()}>Envoyer</button>
          </form>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
            <div>Sélectionnez une conversation</div>
            <div style={{ fontSize: '0.85rem', marginTop: 6 }}>ou créez-en une nouvelle</div>
          </div>
        </div>
      )}
    </div>
  );
}
