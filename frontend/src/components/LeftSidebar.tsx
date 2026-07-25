import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, List, BookOpen, Settings, MessageSquare, Clock } from 'lucide-react';
import type { User as UserType } from '../types';

interface LeftSidebarProps {
  user: UserType;
}

const LeftSidebar = ({ user }: LeftSidebarProps) => {
  const location = useLocation();
  const profileBase = `/profile/${user.username}`;
  const avatarUrl = user.avatar_url
    ? user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`
    : null;

  const navItems = [
    { path: profileBase, label: 'Inicio', icon: Home, exact: true },
    { path: '/timeline', label: 'Timeline', icon: Clock, exact: true },
    { path: `${profileBase}/calendar`, label: 'Calendário', icon: Calendar, exact: true },
    { path: `${profileBase}/lists`, label: 'Listas', icon: List, exact: true },
    { path: `${profileBase}/diary`, label: 'Diário', icon: BookOpen, exact: true },
    { path: `${profileBase}/reviews`, label: 'Reviews', icon: MessageSquare, exact: true },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-[203px] flex flex-col z-40 border-r"
      style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}>

      {/* Logo */}
      <Link to="/" className="flex items-center px-5 h-14 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="font-display font-black tracking-tight text-base">LOGGER</div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon, exact }) => {
          const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
          return (
            <NavLink key={path} to={path} end={exact}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              style={isActive ? { background: 'rgba(255,255,255,0.06)' } : {}}>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />
              )}
              <Icon size={18} style={{ color: isActive ? 'var(--accent)' : undefined }} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-3">
          <Link to={`/profile/${user.username}`} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--border)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-white truncate group-hover:text-white transition-colors">{user.username}</div>
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>@{user.username}</div>
            </div>
          </Link>
          <NavLink to="/settings" className="mt-1 p-1.5 rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-dim)' }}>
            <Settings size={16} />
          </NavLink>
        </div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          <span>v1.0.0</span>
          <span>·</span>
          <span>Powered by <span style={{ color: 'var(--accent)' }}>TMDb</span></span>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;