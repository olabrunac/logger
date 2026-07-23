import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, User } from '../types';
import ActivityGraph from '../components/sections/ActivityGraph';
import StatsSection from '../components/sections/StatsSection';
import GenreChart from '../components/sections/GenreChart';
import HoursPieChart from '../components/sections/HoursPieChart';

interface ProfilePageProps {
  currentUser: User;
}

const TYPE_META: Record<string, { emoji: string; color: string; label: string; slug: string }> = {
  movie: { emoji: '🎬', color: '#fbbf24', label: 'Filmes', slug: 'movies' },
  series: { emoji: '📺', color: '#ef4444', label: 'Séries', slug: 'tvshows' },
  game: { emoji: '🎮', color: '#60a5fa', label: 'Jogos', slug: 'games' },
  book: { emoji: '📚', color: '#4ade80', label: 'Livros', slug: 'books' },
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

const ProfilePage = ({ currentUser }: ProfilePageProps) => {
  const { username } = useParams<{ username: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayUsername = username || currentUser.username;
  const isOwnProfile = displayUsername === currentUser.username;

  useEffect(() => {
    fetchData();
  }, [username]);

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
      setError('Perfil não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()).slice(0, 12);
  }, [logs]);

  const accentColor = profileUser?.accent_color || '#ff6b35';

  const bannerUrl = profileUser?.banner_url
    ? profileUser.banner_url.startsWith('http')
      ? profileUser.banner_url
      : 'http://localhost:8000' + profileUser.banner_url
    : null;

  const avatarUrl = profileUser?.avatar_url
    ? profileUser.avatar_url.startsWith('http')
      ? profileUser.avatar_url
      : 'http://localhost:8000' + profileUser.avatar_url
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
          <h3 className="text-white mb-2">{error || 'Perfil não encontrado'}</h3>
          <p className="text-sm mb-4">O usuário "{displayUsername}" não existe.</p>
          <Link to="/" className="mdf-btn-primary">Voltar ao início</Link>
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
          } : {background:'linear-gradient(135deg, #14181C 0%, #1C2127 50%, #0A0C10 100%)'}}>
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
                <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">{profileUser.username}</h1>
                <div className="text-white/50 text-sm">@{profileUser.username}</div>
              </div>
              {isOwnProfile && (
                <Link to="/settings" className="mdf-btn-ghost flex items-center gap-2 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                  Editar
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const count = logs.filter(l => l.media_item.media_type === key).length;
          const hours = logs.filter(l => l.media_item.media_type === key).reduce((acc, l) => acc + (l.hours_spent || 0), 0);
          return (
            <Link key={key} to={'/profile/' + profileUser.username + '/' + meta.slug} className="mdf-card mdf-card-hover p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: meta.color + '22' }}>
                {meta.emoji}
              </div>
              <div>
                <div className="text-3xl font-display font-black leading-none">{count}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">{meta.label}</div>
                {hours > 0 && <div className="text-[10px] text-white/40 mt-1 font-mono">{Math.round(hours)}h</div>}
              </div>
            </Link>
          );
        })}
      </div>

      <section>
        <h2 className="font-display text-2xl font-bold mb-3">Atividade recente</h2>
        {recentLogs.length === 0 ? (
          <div className="mdf-card p-8 text-center text-white/50">Nenhum log ainda.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {recentLogs.map(log => {
              const typeEmoji = TYPE_META[log.media_item.media_type]?.emoji || '📄';
              return (
                <Link key={log.id} to={'/log/' + log.id} className="poster-tile block group">
                  {log.media_item.cover_image_url ? (
                    <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">{typeEmoji}</span>
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
            })}
          </div>
        )}
      </section>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
        <div className="flex-1 min-w-0">
          <ActivityGraph logs={logs} />
        </div>
        <div className="lg:w-80 flex-shrink-0">
          <HoursPieChart logs={logs} />
        </div>
      </div>
      <StatsSection logs={logs} accentColor={accentColor} />
      <GenreChart logs={logs} accentColor={accentColor} />

      {logs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-3">Todos os Logs</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {logs.map(log => {
              const typeEmoji = TYPE_META[log.media_item.media_type]?.emoji || '📄';
              return (
                <Link key={log.id} to={'/log/' + log.id} className="poster-tile block group">
                  {log.media_item.cover_image_url ? (
                    <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">{typeEmoji}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none"
                       style={{background:'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)'}}>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="text-white text-xs font-semibold truncate">{log.media_item.title}</div>
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
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProfilePage;
