import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, LogReview, User } from '../types';
import TopListsSection from '../components/sections/TopListsSection';
import { TYPE_META, STATUS_COLORS, STATUS_ICONS, getStars } from '../constants/designSystem';

interface ProfilePageProps {
  currentUser: User;
}

const ProfilePage = ({ currentUser }: ProfilePageProps) => {
  const { username } = useParams<{ username: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reviewMap, setReviewMap] = useState<Map<number, LogReview[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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
      const allLogs = logsRes.data || [];
      setLogs(allLogs);

      if (!isOwnProfile) {
        try {
          const followRes = await api.get(`/users/${currentUser.id}/is-following/${targetUser.id}`);
          setIsFollowing(followRes.data.is_following);
        } catch {}
      }

      const reviewLogs = allLogs.filter((l: LogEntry) => l.review && l.review.trim().length > 0);
      if (reviewLogs.length > 0) {
        const r = await api.post('/media/logs/reviews-batch', reviewLogs.map((l: LogEntry) => l.id));
        const map = new Map<number, LogReview[]>();
        Object.entries(r.data).forEach(([logId, reviews]) => {
          if ((reviews as LogReview[]).length > 0) map.set(Number(logId), reviews as LogReview[]);
        });
        setReviewMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch profile data', err);
      setError('Perfil não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.id - a.id).slice(0, 8);
  }, [logs]);

  const reviewEntries = useMemo(() => {
    const entries: { review: LogReview; log: LogEntry }[] = [];
    logs.forEach(l => {
      const reviews = reviewMap.get(l.id);
      if (reviews) {
        reviews.forEach(r => entries.push({ review: r, log: l }));
      }
    });
    return entries.sort((a, b) => b.review.created_at.localeCompare(a.review.created_at));
  }, [logs, reviewMap]);

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

  const handleFollowToggle = async () => {
    if (!profileUser || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/users/${currentUser.id}/follow/${profileUser.id}`);
        setIsFollowing(false);
      } else {
        await api.post(`/users/${currentUser.id}/follow/${profileUser.id}`);
        setIsFollowing(true);
      }
    } catch {}
    setFollowLoading(false);
  };

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
          } : {background:'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 50%, var(--bg) 100%)'}}>
          <div className="absolute inset-0" style={{background:'linear-gradient(to top, var(--mdf-bg), transparent 60%)'}}/>
        </div>
        <div className="flex items-end gap-5 -mt-14 px-4 relative z-10">
          <div className="w-28 h-28 rounded-2xl border-4 overflow-hidden flex-shrink-0"
            style={{borderColor:'var(--mdf-bg)', background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, ' + accentColor + ', var(--purple))'}}>
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
              {isOwnProfile ? (
                <Link to="/settings" className="mdf-btn-ghost flex items-center gap-2 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                  Editar
                </Link>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className="text-sm font-bold px-5 py-2 rounded-full transition-all"
                  style={isFollowing ? {
                    background: 'transparent',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                  } : {
                    background: 'var(--accent)',
                    color: '#000',
                    border: '1px solid transparent',
                  }}
                >
                  {followLoading ? '...' : isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        <Link to={'/profile/' + profileUser.username} className="mdf-card mdf-card-hover p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
            👤
          </div>
          <div>
            <div className="text-3xl font-display font-black leading-none">{logs.length}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">Todos</div>
          </div>
        </Link>
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
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {recentLogs.map(log => {
              const typeEmoji = TYPE_META[log.media_item.media_type]?.emoji || '📄';
              return (
                <Link key={log.id} to={'/log/' + log.id} className="poster-tile block group" style={{borderBottom: '3px solid ' + (TYPE_META[log.media_item.media_type]?.color || '#666')}}>
                  {log.media_item.cover_image_url ? (
                    <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                      <span className="text-3xl">{typeEmoji}</span>
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
                    {log.status && !log.is_favorite && (
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
                  {(log.relog_count ?? 0) > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {(log.relog_count ?? 0) + 1}x
                    </div>
                  ) : log.media_item.media_type === 'series' && log.watched_episodes != null && log.total_episodes != null && log.total_episodes > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {log.watched_episodes}/{log.total_episodes}
                    </div>
                  ) : log.media_item.media_type === 'game' && log.hours_spent != null && log.hours_spent > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {log.hours_spent}h
                    </div>
                  ) : log.media_item.media_type === 'book' && log.hours_spent != null && log.hours_spent > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {log.hours_spent}h
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <TopListsSection
        profileUser={profileUser}
        currentUser={currentUser}
        accentColor={accentColor}
      />

      {reviewEntries.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">Reviews</h2>
            <Link to={`/profile/${profileUser.username}/reviews`} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">Ver todas</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {reviewEntries.slice(0, 10).map(e => {
              const meta = TYPE_META[e.log.media_item.media_type];
              return (
                <Link key={e.review.id} to={'/log/' + e.log.id} className="mdf-card mdf-card-hover rounded-xl overflow-hidden transition-colors block group">
                  <div className="flex">
                    <div className="relative flex-shrink-0 w-20" style={{aspectRatio: '2/3', borderBottom: '3px solid ' + (meta?.color || '#666')}}>
                      {e.log.media_item.cover_image_url ? (
                        <img src={e.log.media_item.cover_image_url} alt="" className="w-full h-full rounded-none object-cover" loading="lazy"/>
                      ) : (
                        <div className="w-full h-full rounded-none flex items-center justify-center" style={{background: (meta?.color || '#666') + '22'}}>
                          <span className="text-sm">{meta?.emoji || '📄'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden justify-center pl-2 pr-2 pt-3 pb-3" style={{borderLeft: '5px solid var(--mdf-bg)'}}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-sm font-semibold text-white/80 truncate min-w-0">{e.log.media_item.title}</div>
                        {e.review.rating != null && e.review.rating > 0 && (
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {getStars(e.review.rating).map((star, i) => (
                              <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                                fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                                stroke="var(--mdf-yellow)" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            ))}
                          </div>
                        )}
                      </div>
                      {e.review.review_text && <p className="text-[13px] text-white/50 leading-relaxed line-clamp-5 mt-1 flex-1">{e.review.review_text.length > 280 ? e.review.review_text.slice(0, 280) + '…' : e.review.review_text}</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {logs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-3">Todos os Logs</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {logs.map(log => {
              const typeEmoji = TYPE_META[log.media_item.media_type]?.emoji || '📄';
              return (
                <Link key={log.id} to={'/log/' + log.id} className="poster-tile block group" style={{borderBottom: '3px solid ' + (TYPE_META[log.media_item.media_type]?.color || '#666')}}>
                  {log.media_item.cover_image_url ? (
                    <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                      <span className="text-3xl">{typeEmoji}</span>
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
                    {log.status && !log.is_favorite && (
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
                  {(log.relog_count ?? 0) > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {(log.relog_count ?? 0) + 1}x
                    </div>
                  ) : log.media_item.media_type === 'series' && log.watched_episodes != null && log.total_episodes != null && log.total_episodes > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {log.watched_episodes}/{log.total_episodes}
                    </div>
                  ) : log.media_item.media_type === 'game' && log.hours_spent != null && log.hours_spent > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {log.hours_spent}h
                    </div>
                  ) : log.media_item.media_type === 'book' && log.hours_spent != null && log.hours_spent > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {log.hours_spent}h
                    </div>
                  ) : null}
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
