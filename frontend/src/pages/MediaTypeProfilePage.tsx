import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, User } from '../types';
import ActivityGraph from '../components/sections/ActivityGraph';
import GenreChart from '../components/sections/GenreChart';
import StatsSection from '../components/sections/StatsSection';
import RatingDistribution from '../components/sections/RatingDistribution';
import FavoritesSection from '../components/sections/FavoriteGamesSection';

interface MediaTypeProfilePageProps {
  currentUser: User;
}

const MEDIA_TYPE_MAP: Record<string, string> = {
  movies: 'movie',
  tvshows: 'series',
  books: 'book',
  games: 'game',
};

const PAGE_META: Record<string, { label: string; emoji: string; color: string }> = {
  movie: { label: 'Filmes', emoji: '🎬', color: '#fbbf24' },
  series: { label: 'Séries', emoji: '📺', color: '#ef4444' },
  game: { label: 'Jogos', emoji: '🎮', color: '#60a5fa' },
  book: { label: 'Livros', emoji: '📚', color: '#4ade80' },
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em progresso',
  completed: 'Completo',
  dropped: 'Abandonado',
  wishlist: 'Desejo',
  soon: 'Em breve',
  platinated: 'Platinado',
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'rgba(59,130,246,0.85)',
  completed: 'rgba(34,197,94,0.85)',
  dropped: 'rgba(239,68,68,0.85)',
  wishlist: 'rgba(168,85,247,0.85)',
  soon: 'rgba(168,85,247,0.85)',
  platinated: 'rgba(250,204,21,0.85)',
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

const PosterTile = ({ log, fallbackEmoji }: { log: LogEntry; fallbackEmoji: string }) => (
  <Link key={log.id} to={'/log/' + log.id} className="poster-tile block group">
    {log.media_item.cover_image_url ? (
      <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-3xl">{fallbackEmoji}</span>
      </div>
    )}
    <div className="absolute inset-0 pointer-events-none"
         style={{background:'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)'}}>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="text-white text-xs font-semibold truncate">{log.media_item.title}</div>
        <div className="text-white/50 text-[10px] mt-0.5">
          {new Date(log.log_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </div>
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
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background: STATUS_COLORS[log.status] || 'rgba(100,100,100,0.85)'}}>
          {STATUS_LABELS[log.status] || log.status}
        </span>
      )}
    </div>
    {log.platform && (
      <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
        {log.platform}
      </div>
    )}
  </Link>
);

const MediaTypeProfilePage = ({ currentUser }: MediaTypeProfilePageProps) => {
  const { username, mediaType: urlMediaType } = useParams<{ username: string; mediaType: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaType = MEDIA_TYPE_MAP[urlMediaType || ''] || 'movie';
  const meta = PAGE_META[mediaType] || PAGE_META.movie;
  const displayUsername = username || currentUser.username;
  const isOwnProfile = displayUsername === currentUser.username;

  useEffect(() => {
    fetchData();
  }, [username, urlMediaType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let targetUser: User;
      if (isOwnProfile) {
        targetUser = currentUser;
      } else {
        const userRes = await api.get('/login/by-username/' + encodeURIComponent(displayUsername));
        targetUser = userRes.data;
      }
      setProfileUser(targetUser);
      const logsRes = await api.get('/media/logs', { params: { user_id: targetUser.id, limit: 500 } });
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch profile data', err);
      setError('Perfil nao encontrado');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => l.media_item.media_type === mediaType);
  }, [logs, mediaType]);

  const recentLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()).slice(0, 10);
  }, [filteredLogs]);

  const reviewLogs = useMemo(() => {
    return filteredLogs.filter((l) => l.review && l.review.trim().length > 0);
  }, [filteredLogs]);

  const accentColor = profileUser?.accent_color || meta.color;

  const bannerUrl = profileUser?.banner_url
    ? profileUser.banner_url.startsWith('http') ? profileUser.banner_url : 'http://localhost:8000' + profileUser.banner_url
    : null;

  const avatarUrl = profileUser?.avatar_url
    ? profileUser.avatar_url.startsWith('http') ? profileUser.avatar_url : 'http://localhost:8000' + profileUser.avatar_url
    : null;

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="space-y-10">
        <div className="mdf-card p-8 text-center text-white/50">
          <h3 className="text-white mb-2">{error || 'Perfil nao encontrado'}</h3>
          <p className="text-sm mb-4">O usuario "{displayUsername}" nao existe.</p>
          <Link to="/" className="mdf-btn-primary">Voltar ao inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="relative">
        <div className="h-52 md:h-64 rounded-2xl overflow-hidden relative border border-white/5"
          style={bannerUrl ? {
            backgroundImage: 'url(' + bannerUrl + ')',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {background:'linear-gradient(135deg, ' + meta.color + '22 0%, #14181C 50%, #0A0C10 100%)'}}>
          <div className="absolute inset-0" style={{background:'linear-gradient(to top, var(--mdf-bg), transparent 60%)'}}/>
        </div>
        <div className="flex items-end gap-5 -mt-14 px-4 relative z-10">
          <div className="w-28 h-28 rounded-2xl border-4 overflow-hidden flex-shrink-0"
            style={{borderColor:'var(--mdf-bg)', background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, ' + accentColor + ', #a855f7)'}}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={profileUser.username} className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-3xl font-black text-white/60">
                {profileUser.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-white/40 mb-0.5">
                  <Link to={'/profile/' + profileUser.username} className="hover:text-white/60 transition-colors">
                    @{profileUser.username}
                  </Link>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2">
                  <span>{meta.emoji}</span>
                  {meta.label}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-display font-black" style={{color: meta.color}}>
                  {filteredLogs.length}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/50">logs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FavoritesSection logs={logs} accentColor={accentColor} mediaType={mediaType} />

      <div className="flex gap-2 flex-wrap">
        {Object.entries(PAGE_META).map(([key, m]) => (
          <Link key={key} to={'/profile/' + displayUsername + '/' + (key === 'movie' ? 'movies' : key === 'series' ? 'tvshows' : key === 'game' ? 'games' : 'books')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mediaType === key ? 'text-white' : 'text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70'}`}
            style={mediaType === key ? { background: m.color + 'cc' } : {}}>
            {m.emoji} {m.label}
          </Link>
        ))}
      </div>

      <section>
        <h2 className="font-display text-2xl font-bold mb-3">Atividade recente</h2>
        {recentLogs.length === 0 ? (
          <div className="mdf-card p-8 text-center text-white/50">Nenhum log ainda.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {recentLogs.map(log => (
              <PosterTile key={log.id} log={log} fallbackEmoji={meta.emoji} />
            ))}
          </div>
        )}
      </section>

      <ActivityGraph logs={logs} mediaType={mediaType} />
      <StatsSection logs={logs} accentColor={accentColor} mediaType={mediaType} />
      <GenreChart logs={logs} accentColor={accentColor} mediaType={mediaType} />
      <RatingDistribution logs={logs} mediaType={mediaType} color={meta.color} />

      {reviewLogs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-3">Reviews</h2>
          <div className="space-y-3">
            {reviewLogs.slice(0, 10).map(log => (
              <Link key={log.id} to={'/log/' + log.id} className="mdf-card mdf-card-hover p-4 flex gap-4 transition-colors block">
                {log.media_item.cover_image_url ? (
                  <img src={log.media_item.cover_image_url} alt="" className="w-14 h-20 rounded object-cover flex-shrink-0" loading="lazy"/>
                ) : (
                  <div className="w-14 h-20 rounded flex items-center justify-center flex-shrink-0" style={{background: meta.color + '22'}}>
                    <span className="text-2xl">{meta.emoji}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{log.media_item.title}</span>
                    {log.rating != null && log.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {getStars(log.rating).map((star, i) => (
                          <svg key={i} width="10" height="10" viewBox="0 0 24 24"
                            fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                            stroke="var(--mdf-yellow)" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-white/60 line-clamp-3">{log.review}</p>
                  <div className="text-[10px] text-white/30 mt-1">
                    {new Date(log.log_date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {filteredLogs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-3">Todos os {meta.label}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filteredLogs.map(log => (
              <PosterTile key={log.id} log={log} fallbackEmoji={meta.emoji} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MediaTypeProfilePage;
