import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Home, Clock, Bell, Calendar, List, BookOpen, MessageSquare, Search, Settings, LogOut, LogIn, Menu, Compass } from 'lucide-react';
import { getUnreadCount } from '../services/api';
import type { User as UserType } from '../types';
import { imageUrl } from '../utils';
import LayoutModeToggle from './LayoutModeToggle';

interface MobileNavProps {
  user: UserType | null;
  onLogout: () => void;
  refreshUnreadTrigger?: number;
}

const MobileNav = ({ user, onLogout, refreshUnreadTrigger }: MobileNavProps) => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }
    return () => document.body.classList.remove('drawer-open');
  }, [open]);

  useEffect(() => {
    if (!user) return;
    getUnreadCount(user.id).then(r => setUnreadCount(r.data.count)).catch(() => {});
  }, [user, refreshUnreadTrigger]);

  const avatarUrl = user ? imageUrl(user.avatar_url) : null;
  const profileBase = user ? `/profile/${user.username}` : '';

  const navItems = [
    { path: profileBase, label: 'Inicio', icon: Home, exact: true },
    { path: '/timeline', label: 'Timeline', icon: Clock, exact: true },
    { path: '/search', label: 'Buscar', icon: Search, exact: true },
    { path: '/notifications', label: 'Notificacoes', icon: Bell, exact: true },
    { path: '/what-to-do', label: 'O que fazer?', icon: Compass, exact: true },
    { path: `${profileBase}/calendar`, label: 'Calendario', icon: Calendar, exact: true },
    { path: `${profileBase}/lists`, label: 'Listas', icon: List, exact: true },
    { path: `${profileBase}/diary`, label: 'Diario', icon: BookOpen, exact: true },
    { path: `${profileBase}/reviews`, label: 'Reviews', icon: MessageSquare, exact: true },
    { path: '/settings', label: 'Configuracoes', icon: Settings, exact: true },
  ];

  return (
    <>
      {/* Mobile header */}
      <header
        className="safe-top fixed inset-x-0 top-0 z-40 flex min-h-14 items-end justify-between px-4 pb-2 lg:hidden bg-[var(--mdf-bg)]/90 backdrop-blur-md border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => setOpen(true)}
          className="h-11 w-11 flex items-center justify-center active:scale-95 active:opacity-80"
          aria-label="Abrir menu"
        >
          {user && avatarUrl ? (
            <img src={avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover border" style={{ borderColor: 'var(--accent)' }} />
          ) : user ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          ) : (
            <Menu size={24} />
          )}
        </button>

        <Link to="/" className="font-display font-black tracking-[1.5px] text-xs" style={{ color: 'var(--accent)' }}>LOGGER</Link>

        {user ? (
          <Link to="/notifications" className="h-11 w-11 flex items-center justify-center relative" aria-label="Notificações">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: '#ef4444' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        ) : (
          <div className="h-11 w-11" />
        )}
      </header>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 lg:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-[61] flex w-[min(300px,80vw)] flex-col border-r bg-[var(--mdf-bg)] transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {user ? (
          <div className="border-b flex items-center gap-3 px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]" style={{ borderColor: 'var(--border)' }}>
            <Link to={profileBase} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: 'var(--accent)' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{user.username}</div>
                <div className="text-xs text-white/40 truncate">@{user.username}</div>
              </div>
            </Link>
            <button
              onClick={onLogout}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="border-b px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]" style={{ borderColor: 'var(--border)' }}>
            <div className="font-display font-black tracking-[1.5px] text-sm mb-3" style={{ color: 'var(--accent)' }}>LOGGER</div>
            <Link to="/login" className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent)', color: '#000' }}>
              <LogIn size={16} /> Entrar
            </Link>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2">
          {user && navItems.map(({ path, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                end={exact}
                className={`relative flex h-12 items-center gap-4 px-5 text-base font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/50 active:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ background: 'var(--accent)' }} />
                )}
                <Icon size={22} style={{ color: isActive ? 'var(--accent)' : undefined }} />
                <span className="flex-1">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t px-5 py-4 text-[10px] text-white/25 safe-bottom flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
          <LayoutModeToggle />
          <div className="flex items-center justify-between gap-2">
            <span>Logger v1.0</span>
            <span className="text-white/15">Powered by IGDB, TMDB</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
