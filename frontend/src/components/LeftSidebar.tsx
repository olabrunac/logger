import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, List, BookOpen, Settings, MessageSquare, Clock, LogOut, LogIn, Bell, Search, Compass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUnreadCount } from '../services/api';
import type { User as UserType } from '../types';
import { imageUrl } from '../utils';
import LayoutModeToggle from './LayoutModeToggle';

interface LeftSidebarProps {
  user: UserType | null;
  onLogout: () => void;
  refreshUnreadTrigger?: number;
}

const LeftSidebar = ({ user, onLogout, refreshUnreadTrigger }: LeftSidebarProps) => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getUnreadCount(user.id).then(r => setUnreadCount(r.data.count)).catch(() => {});
    const interval = setInterval(() => {
      getUnreadCount(user.id).then(r => setUnreadCount(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname, refreshUnreadTrigger]);

  if (!user) {
    return (
      <aside
        className="hidden lg:flex fixed top-0 left-0 h-screen w-[203px] flex-col z-40 border-r"
        style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}
      >
        <Link to="/" className="flex items-center px-5 h-12 flex-shrink-0 border-b transition-colors hover:bg-white/[0.03]"
          style={{ borderColor: 'var(--border)' }}>
          <div className="font-display font-black tracking-tight text-base" style={{ color: 'var(--accent)' }}>LOGGER</div>
        </Link>

        <nav className="flex-1 py-3 px-3 space-y-1">
          <NavLink
            to="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <LogIn size={18} style={{ color: 'var(--accent)' }} />
            <span>Entrar</span>
          </NavLink>
        </nav>

        <div className="px-3 py-3 border-t text-[10px] text-white/20 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <LayoutModeToggle />
          <div>Logger v1.0</div>
        </div>
      </aside>
    );
  }

  const profileBase = `/profile/${user.username}`;
  const avatarUrl = imageUrl(user.avatar_url);

  const navItems = [
    { path: profileBase, label: 'Inicio', icon: Home, exact: true },
    { path: '/timeline', label: 'Timeline', icon: Clock, exact: true },
    { path: '/notifications', label: 'Notificacoes', icon: Bell, exact: true, badge: unreadCount },
    { path: '/what-to-do', label: 'O que fazer?', icon: Compass, exact: true },
    { path: `${profileBase}/calendar`, label: 'Calendario', icon: Calendar, exact: true },
    { path: `${profileBase}/lists`, label: 'Listas', icon: List, exact: true },
    { path: `${profileBase}/diary`, label: 'Diario', icon: BookOpen, exact: true },
    { path: `${profileBase}/reviews`, label: 'Reviews', icon: MessageSquare, exact: true },
  ];

  const followersCount = user.followers_count ?? 0;
  const followingCount = user.following_count ?? 0;

  return (
    <aside
      className="hidden lg:flex fixed top-0 left-0 h-screen w-[203px] flex-col z-40 border-r"
      style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center px-5 h-12 flex-shrink-0 border-b transition-colors hover:bg-white/[0.03]"
        style={{ borderColor: 'var(--border)' }}>
        <div className="font-display font-black tracking-tight text-base" style={{ color: 'var(--accent)' }}>LOGGER</div>
      </Link>

      {/* Profile Section */}
      <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link to={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <div
            className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 transition-colors"
            style={{ borderColor: 'var(--accent)' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate group-hover:text-white transition-colors">{user.username}</div>
            <div className="text-xs text-white/40 truncate">@{user.username}</div>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all flex-shrink-0"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Followers / Following */}
      <div
        className="px-5 py-2.5 flex items-center gap-1 text-xs border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
      >
        <span className="font-bold" style={{ color: 'var(--accent)' }}>{followingCount}</span>
        <span className="text-white/40">Seguindo</span>
        <span className="text-white/20 mx-1">·</span>
        <span className="font-bold" style={{ color: 'var(--accent)' }}>{followersCount}</span>
        <span className="text-white/40">Seguidores</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 flex-shrink-0">
        <NavLink
          to="/search"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'text-white bg-white/5' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`
          }
          title="Buscar mídias e perfis"
        >
          <Search size={18} style={{ color: 'var(--accent)' }} />
          <span>Buscar</span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon, exact, badge }) => {
          const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              style={isActive ? { background: 'rgba(255,255,255,0.06)' } : {}}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              <Icon size={18} style={{ color: isActive ? 'var(--accent)' : undefined }} />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - Settings */}
      <div className="px-3 py-3 border-t flex-shrink-0 space-y-1" style={{ borderColor: 'var(--border)' }}>
        <LayoutModeToggle className="px-3 py-2" />
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <Settings size={18} />
          <span>Configuracoes</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default LeftSidebar;
