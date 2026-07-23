import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User, LogEntry, MediaType } from '../types';

interface HomePageProps {
  user: User;
}

const TYPE_META: Record<MediaType, { emoji: string; color: string }> = {
  movie: { emoji: '🎬', color: '#fbbf24' },
  series: { emoji: '📺', color: '#ef4444' },
  game: { emoji: '🎮', color: '#60a5fa' },
  book: { emoji: '📚', color: '#4ade80' },
};

const STATUS_ICONS: Record<string, string> = {
  completed: '✓',
  in_progress: '•••',
  dropped: '💀',
  wishlist: '★',
  soon: '…',
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'rgba(59,130,246,0.85)',
  completed: 'rgba(34,197,94,0.85)',
  dropped: 'rgba(239,68,68,0.85)',
  wishlist: 'rgba(168,85,247,0.85)',
  soon: 'rgba(168,85,247,0.85)',
  platinated: 'rgba(250,204,21,0.85)',
};

const HomePage = ({ user }: HomePageProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const logsRes = await api.get('/media/logs', { params: { user_id: user.id, limit: 12 } });
      const sorted = (logsRes.data || []).sort((a: LogEntry, b: LogEntry) => b.id - a.id);
      setLogs(sorted);
    } catch (err) {
      console.error('Failed to fetch home data', err);
    } finally {
      setLoading(false);
    }
  };

  const getStars = (rating?: number) => {
    if (!rating) return [];
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) stars.push('full');
      else if (i - 0.5 <= rating) stars.push('half');
      else stars.push('empty');
    }
    return stars;
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

  return (
    <div className="space-y-10">
      <div className="relative">
        <div className="h-52 md:h-64 rounded-2xl overflow-hidden relative border border-white/5">
          <div className="w-full h-full" style={{background:'linear-gradient(135deg, #14181C 0%, #1C2127 50%, #0A0C10 100%)'}}/>
          <div className="absolute inset-0" style={{background:'radial-gradient(circle at 20% 80%, rgba(0,224,84,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(250,51,128,0.08) 0%, transparent 50%)'}}/>
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{background:'linear-gradient(to top, var(--mdf-bg), transparent)'}}/>
        </div>
        <div className="flex items-end justify-between px-6 -mt-14 relative z-10">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">Bem-vindo, {user.username}!</h1>
            <p className="text-white/50 text-sm mt-1">Continue registrando suas experiências</p>
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
          <h2 className="font-display text-2xl font-bold">Atividade recente</h2>
          <Link to={`/profile/${user.username}`} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">Ver todos</Link>
        </div>

        {loading ? (
          <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="mdf-card p-8 text-center text-white/50">
            Nenhum log ainda. Clique em <span className="text-white font-semibold">Novo log</span> para começar.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {logs.map(log => (
              <Link key={log.id} to={`/log/${log.id}`} className="poster-tile block group">
                {log.media_item.cover_image_url ? (
                  <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                    <span className="text-3xl">{TYPE_META[log.media_item.media_type]?.emoji || '📄'}</span>
                    <div className="text-xs text-white/70 font-medium line-clamp-3">{log.media_item.title}</div>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none"
                     style={{background:'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)'}}>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-white text-xs font-semibold truncate">{log.media_item.title}</div>
                    {log.rating && log.rating > 0 && (
                      <div className="mt-1 flex items-center gap-0.5">
                        {getStars(log.rating).map((star, i) => (
                          <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                            fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                            stroke="var(--mdf-yellow)" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {log.is_favorite && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:'var(--mdf-pink)'}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </div>
                  )}
                  {log.status && (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{background: STATUS_COLORS[log.status] || 'rgba(100,100,100,0.85)'}}>
                      {STATUS_ICONS[log.status] || log.status[0].toUpperCase()}
                    </span>
                  )}
                  {log.media_item.media_type === 'game' && log.unlocked_achievements != null && log.total_achievements != null && log.total_achievements > 0 && (
                    <span className="h-6 px-1.5 flex items-center justify-center text-[9px] font-bold backdrop-blur-sm rounded-full" style={{ background: log.unlocked_achievements === log.total_achievements ? 'rgba(250,204,21,0.85)' : 'rgba(0,0,0,0.7)', color: log.unlocked_achievements === log.total_achievements ? '#000' : '#fff' }}>
                      {log.unlocked_achievements === log.total_achievements ? '100%' : `${log.unlocked_achievements}/${log.total_achievements}`}
                    </span>
                  )}
                </div>
                {log.platform && (
                  <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                    {log.platform}
                  </div>
                )}
                {log.media_item.media_type === 'movie' && (log.relog_count ?? 0) > 0 && (
                  <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                    {(log.relog_count ?? 0) + 1}x
                  </div>
                )}
                {log.media_item.media_type === 'series' && log.watched_episodes != null && log.total_episodes != null && log.total_episodes > 0 && (
                  <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                    {log.watched_episodes}/{log.total_episodes}
                  </div>
                )}
                {log.media_item.media_type === 'game' && log.hours_spent != null && log.hours_spent > 0 && (
                  <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                    {log.hours_spent}h
                  </div>
                )}
                {log.media_item.media_type === 'book' && log.hours_spent != null && log.hours_spent > 0 && (
                  <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                    {log.hours_spent}h
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
