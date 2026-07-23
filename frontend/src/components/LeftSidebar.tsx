import { NavLink, Link } from 'react-router-dom';
import { Home, Calendar, List, BookOpen, PlusCircle, Settings } from 'lucide-react';
import type { User as UserType } from '../types';

interface LeftSidebarProps {
  user: UserType;
}

const navItems = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/calendar', label: 'Calendário', icon: Calendar },
  { to: '/lists', label: 'Listas', icon: List },
  { to: '/diary', label: 'Diário', icon: BookOpen },
  { to: '/new-log', label: 'Novo Log', icon: PlusCircle },
];

const LeftSidebar = ({ user }: LeftSidebarProps) => {
  const avatarUrl = user.avatar_url
    ? user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`
    : null;

  return (
    <aside className="fixed top-0 left-0 h-screen w-[360px] flex flex-col z-40 border-r"
      style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <span className="font-display font-black text-black text-sm">L</span>
        </div>
        <div>
          <div className="font-display font-black tracking-tight text-base leading-none">LOGGER</div>
          <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>Diário Cultural</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : {}}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />
                )}
                <Icon size={18} style={{ color: isActive ? 'var(--accent)' : undefined }} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          <span>v1.0.0</span>
          <span>·</span>
          <span>Powered by <span style={{ color: 'var(--accent)' }}>TMDb</span></span>
        </div>

        {/* Mini Profile */}
        <Link to={`/profile/${user.username}`} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--border)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate group-hover:text-white transition-colors">{user.username}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>@{user.username}</div>
          </div>
        </Link>

        <NavLink to="/settings" className="flex items-center gap-2 text-[11px] transition-colors"
          style={{ color: 'var(--text-dim)' }}>
          <Settings size={12} />
          <span>Configurações</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default LeftSidebar;
