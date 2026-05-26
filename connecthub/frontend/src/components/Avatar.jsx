import React from 'react';

export default function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { xs: 'avatar-xs', sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg', xl: 'avatar-xl' };
  const initials = user?.display_name
    ? user.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.username?.[0] || '?').toUpperCase();

  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.display_name} className={`avatar ${sizes[size]} ${className}`} />;
  }
  return (
    <div className={`avatar ${sizes[size]} ${className}`}>{initials}</div>
  );
}
