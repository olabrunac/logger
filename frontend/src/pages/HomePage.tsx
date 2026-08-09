import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User, LogEntry } from '../types';
import { ChevronRight } from 'lucide-react';
import { imageUrl, bannerPosition, sortLogsByDate } from '../utils';
import YgpCard from '../components/sections/YgpCard';

interface HomePageProps {
  user: User;
}

const HomePage = ({ user }: HomePageProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const logsRes = await api.get('/media/logs', { params: { user_id: user.id, limit: 12 } });
      const sorted = sortLogsByDate(logsRes.data || []);
      setLogs(sorted);
    } catch (err) {
      console.error('Failed to fetch home data', err);
    } finally {
      setLoading(false);
    }
  };

  const movieCount = logs.filter(l => l.media_item.media_type === 'movie').length;
  const seriesCount = logs.filter(l => l.media_item.media_type === 'series').length;
  const gameCount = logs.filter(l => l.media_item.media_type === 'game').length;
  const bookCount = logs.filter(l => l.media_item.media_type === 'book').length;

  const statItems = [
    { label: 'Filmes', value: movieCount, emoji: '🎬', color: '#fbbf24', slug: 'movies' },
    { label: 'Séries', value: seriesCount, emoji: '📺', color: '#ef4444', slug: 'tvshows' },
    { label: 'Jogos', value: gameCount, emoji: '🎮', color: '#60a5fa', slug: 'games' },
    { label: 'Livros', value: bookCount, emoji: '📚', color: '#4ade80', slug: 'books' },
  ];

  const bannerUrl = imageUrl(user.banner_url);
  const avatarUrl = imageUrl(user.avatar_url);

  return (
    <div className="space-y-10">
      <div className="relative">
        <div className="h-52 md:h-64 rounded-2xl overflow-hidden relative border border-white/5"
          style={bannerUrl ? {
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: bannerPosition(user.banner_position),
          } : {
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 50%, var(--bg) 100%)',
          }}>
          {!bannerUrl && <div className="absolute inset-0" style={{background:'radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(250,51,128,0.08) 0%, transparent 50%)'}}/>}
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{background:'linear-gradient(to top, var(--mdf-bg), transparent)'}}/>
        </div>
        <div className="flex items-end justify-between px-6 -mt-14 relative z-10">
          <div className="flex items-end gap-4">
            <Link to={`/profile/${user.username}`} className="w-20 h-20 rounded-2xl overflow-hidden border-4 flex-shrink-0" style={{ borderColor: 'var(--mdf-bg)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-display font-black" style={{ background: user.accent_color || 'var(--accent)', color: '#000' }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="pb-1">
              <h1 className="font-display text-2xl font-black tracking-tight">{user.username}</h1>
              <p className="text-white/50 text-sm mt-0.5">Continue registrando suas experiências</p>
            </div>
          </div>
          <Link to="/new-log" className="mdf-btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Novo log</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statItems.map((stat) => (
          <Link key={stat.label} to={`/profile/${user.username}/${stat.slug}`} className="mdf-card mdf-card-hover p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: stat.color + '22' }}>
              {stat.emoji}
            </div>
            <div>
              <div className="text-3xl font-display font-black leading-none">{stat.value}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl font-bold">Logs recentes</h2>
          <Link to={`/profile/${user.username}`} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors" style={{ color: 'var(--accent)' }}>Ver mais <ChevronRight size={14} /></Link>
        </div>

        {loading ? (
          <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="mdf-card p-8 text-center text-white/50">
            Nenhum log ainda. Clique em <span className="text-white font-semibold">Novo log</span> para começar.
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
            {logs.map(log => (
              <YgpCard key={log.id} log={log} accentColor={user.accent_color} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
