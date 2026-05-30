// ConnectHub - Centralized API client
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getToken = () => localStorage.getItem('ch_token');

const api = {
  _fetch: async (method, path, body = null) => {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  },
  get:    (path)         => api._fetch('GET',    path),
  post:   (path, body)   => api._fetch('POST',   path, body),
  put:    (path, body)   => api._fetch('PUT',    path, body),
  patch:  (path, body)   => api._fetch('PATCH',  path, body),
  delete: (path, body)   => api._fetch('DELETE', path, body),

  // Auth
  login:    (identifier, password) => api.post('/auth/login',    { identifier, password }),
  register: (data)                 => api.post('/auth/register', data),
  me:       ()                     => api.get('/auth/me'),

  // Feed
  feed:        (params = {}) => api.get(`/posts?${new URLSearchParams(params)}`),
  createPost:  (data)        => api.post('/posts', data),
  updatePost:  (id, data)    => api.put(`/posts/${id}`, data),
  deletePost:  (id)          => api.delete(`/posts/${id}`),
  sharePost:   (id)          => api.post(`/posts/${id}/share`),
  postComments:(id)          => api.get(`/posts/${id}/comments`),

  // Reactions
  react:   (data) => api.post('/reactions', data),
  unreact: (data) => api.delete('/reactions', data),

  // Comments
  createComment: (data) => api.post('/comments', data),
  updateComment: (id, data) => api.put(`/comments/${id}`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),

  // Users
  getUser:      (id)       => api.get(`/users/${id}`),
  updateUser:   (id, data) => api.put(`/users/${id}`, data),
  userPosts:    (id)       => api.get(`/users/${id}/posts`),
  follow:       (id)       => api.post(`/users/${id}/follow`),
  unfollow:     (id)       => api.delete(`/users/${id}/follow`),
  followers:    (id)       => api.get(`/users/${id}/followers`),
  following:    (id)       => api.get(`/users/${id}/following`),

  // Communities
  communities:       (params = {})        => api.get(`/communities?${new URLSearchParams(params)}`),
  getCommunity:      (id)                 => api.get(`/communities/${id}`),
  createCommunity:   (data)               => api.post('/communities', data),
  joinCommunity:     (id)                 => api.post(`/communities/${id}/join`),
  leaveCommunity:    (id)                 => api.delete(`/communities/${id}/join`),
  updateMemberRole:  (commId, uid, role)  => api.put(`/communities/${commId}/members/${uid}`, { role }),
  deleteCommunity:   (id)                 => api.delete(`/communities/${id}`),
  removeMember:      (id,uid)             => api.delete(`/communities/${id}/members/${uid}`),

  // Notifications
  notifications: ()   => api.get('/notifications'),
  markAllRead:   ()   => api.post('/notifications/read-all'),
  markRead:      (id) => api.put(`/notifications/${id}`, { is_read: 1 }),

  // Conversations
  conversations: ()              => api.get('/conversations'),
  getMessages:   (id)            => api.get(`/conversations/${id}/messages`),
  createConv:    (data)          => api.post('/conversations', data),
  sendMessage:   (id, content)   => api.post(`/conversations/${id}/messages`, { content }),
  markUnread:    (id)            => api.put(`/conversations/${id}/mark-unread`),
  markread:      (id)            => api.put(`/conversations/${id}/mark-read`),

  // Reports
  report:        (data)       => api.post('/reports', data),
  getReports:    (status)     => api.get(`/reports?status=${status}`),
  updateReport:  (id, status) => api.put(`/reports/${id}`, { status }),

  // Search
  search: (q, type = 'all') => api.get(`/search?q=${encodeURIComponent(q)}&type=${type}`),
};

export default api;
