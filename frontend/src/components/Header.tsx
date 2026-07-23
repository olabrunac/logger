import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { User } from '../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenLog?: () => void;
}

const Header = ({ user, onLogout, onOpenLog }: HeaderProps) => {
  const nav = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!user) return null;

  const avatarUrl = user.avatar_url
    ? user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`
    : null;

  const items = [
    { to: '/', label: 'Inicio' },
    { to: '/calendar', label: 'Calendario' },
    { to: '/lists', label: 'Listas' },
    { to: '/diary', label: 'Diario' },
    { to: `/profile/${user.username}`, label: 'Perfil' },
  ];

  const handleLogout = () => {
    onLogout();
    setShowUserMenu(false);
    nav('/login');
  };

  return (
    <header className="mdf-glass sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{background:'var(--accent)'}}>
            <span className="font-display font-black text-black text-sm">L</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-display font-black tracking-tight text-lg leading-none">Logger</div>
            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Diário Cultural</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {items.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }>
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {onOpenLog && (
            <button onClick={onOpenLog} className="mdf-btn-primary flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">Novo log</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-center transition-colors overflow-hidden"
              title="Menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:'var(--mdf-green)', color:'#000'}}>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 mdf-card overflow-hidden z-50" style={{animation:'slideDown 0.15s ease'}}>
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="font-semibold">{user.username}</div>
                  <div className="text-xs text-white/40">ID: {user.id}</div>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="block w-full px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Configurações
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 border-t border-white/5 transition-colors"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
};

export default Header;
