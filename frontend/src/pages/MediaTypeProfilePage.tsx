import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getUserCustomLists } from '../services/api';
import type { LogEntry, LogReview, User, CustomList, TopListItem, MediaItem } from '../types';
import { TYPE_META, STATUS_COLORS, STATUS_ICONS, getStars } from '../constants/designSystem';

interface MediaTypeProfilePageProps {
  currentUser: User;
}

const MEDIA_TYPE_MAP: Record<string, string> = {
  movies: 'movie',
  tvshows: 'series',
  books: 'book',
  games: 'game',
};

const PAGE_META = TYPE_META;

const MEDIA_TYPE_URL_MAP: Record<string, string> = {
  movie: 'movies',
  series: 'tvshows',
  book: 'books',
  game: 'games',
};

const PosterTile = ({ log, fallbackEmoji, color }: { log: LogEntry; fallbackEmoji: string; color: string }) => (
  <Link key={log.id} to={'/log/' + log.id} className="poster-tile block group" style={{borderBottom: '3px solid ' + color}}>
    {log.media_item.cover_image_url ? (
      <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy"/>
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
        <span className="text-3xl">{fallbackEmoji}</span>
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

const STATUS_SECTIONS = [
  { id: 'in_progress', label: 'Em Progresso', status: 'in_progress', emptyMsg: 'Nenhuma mídia em progresso.' },
  { id: 'completed', label: 'Finalizados', status: 'completed', emptyMsg: 'Nenhuma mídia finalizada.' },
  { id: 'wishlist', label: 'Na Lista de Desejos', status: 'wishlist', emptyMsg: 'Nenhuma mídia na lista de desejos.' },
  { id: 'dropped', label: 'Abandonados', status: 'dropped', emptyMsg: 'Nenhuma mídia abandonada.' },
];

const MediaTypeProfilePage = ({ currentUser }: MediaTypeProfilePageProps) => {
  const { username, mediaType: urlMediaType } = useParams<{ username: string; mediaType: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reviewMap, setReviewMap] = useState<Map<number, LogReview[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpanded, setShowExpanded] = useState<Record<string, boolean>>({});
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [topListItems, setTopListItems] = useState<TopListItem[]>([]);

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

      const [logsRes, customListsRes, topListRes] = await Promise.all([
        api.get('/media/logs', { params: { user_id: targetUser.id, limit: 500 } }),
        getUserCustomLists(targetUser.id),
        api.get(`/media/users/${targetUser.id}/top-list`),
      ]);
      const allLogs = logsRes.data || [];
      setLogs(allLogs);
      setCustomLists(customListsRes.data || []);
      setTopListItems(topListRes.data || []);

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
      setError('Perfil nao encontrado');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => logs.filter(l => l.media_item.media_type === mediaType), [logs, mediaType]);
  const completedLogs = useMemo(() => filteredLogs.filter(l => l.status === 'completed'), [filteredLogs]);
  const reviewEntries = useMemo(() => {
    const entries: { review: LogReview; log: LogEntry }[] = [];
    filteredLogs.forEach(l => {
      const reviews = reviewMap.get(l.id);
      if (reviews) reviews.forEach(r => entries.push({ review: r, log: l }));
    });
    return entries.sort((a, b) => b.review.created_at.localeCompare(a.review.created_at));
  }, [filteredLogs, reviewMap]);
  const filteredCustomLists = useMemo(() =>
    customLists.filter(list => list.items.some(item => item.media_item?.media_type === mediaType)),
    [customLists, mediaType]);
  const currentTopItems = useMemo(() =>
    topListItems.filter(item => item.media_item?.media_type === mediaType).sort((a, b) => a.position - b.position),
    [topListItems, mediaType]);

  const accentColor = profileUser?.accent_color || meta.color;
  const bannerUrl = profileUser?.banner_url
    ? profileUser.banner_url.startsWith('http') ? profileUser.banner_url : 'http://localhost:8000' + profileUser.banner_url
    : null;
  const avatarUrl = profileUser?.avatar_url
    ? profileUser.avatar_url.startsWith('http') ? profileUser.avatar_url : 'http://localhost:8000' + profileUser.avatar_url
    : null;

  const toggleExpand = (key: string) => setShowExpanded(prev => ({ ...prev, [key]: !prev[key] }));

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
          } : {background:'linear-gradient(135deg, ' + meta.color + '22 0%, var(--bg-elevated) 50%, var(--bg) 100%)'}}>
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
                  {completedLogs.length}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/50">finalizados</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Link to={'/profile/' + displayUsername} className="mdf-card mdf-card-hover p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            👤
          </div>
          <div>
            <div className="text-3xl font-display font-black leading-none text-white/50">Todos</div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">Geral</div>
          </div>
        </Link>
        {Object.entries(PAGE_META).map(([key, m]) => {
          const count = logs.filter(l => l.media_item.media_type === key && (l.status === 'completed' || l.status === 'in_progress' || l.status === 'dropped')).length;
          const hours = logs.filter(l => l.media_item.media_type === key && (l.status === 'completed' || l.status === 'in_progress' || l.status === 'dropped')).reduce((acc, l) => acc + (l.hours_spent || 0), 0);
          const isActive = mediaType === key;
          return (
            <Link key={key} to={'/profile/' + displayUsername + '/' + MEDIA_TYPE_URL_MAP[key]}
              className={`mdf-card p-5 flex items-center gap-4 transition-all ${isActive ? 'ring-1' : 'mdf-card-hover'}`}
              style={isActive ? { borderColor: m.color + '44' } : {}}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: m.color + '22' }}>
                {m.emoji}
              </div>
              <div>
                <div className="text-3xl font-display font-black leading-none">{count}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">{m.label}</div>
                {hours > 0 && <div className="text-[10px] text-white/40 mt-1 font-mono">{Math.round(hours)}h</div>}
              </div>
            </Link>
          );
        })}
      </div>

      {currentTopItems.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">Top 5</h2>
          </div>
          <div className="flex gap-3">
            {currentTopItems.map((item, index) => {
              const media = item.media_item as MediaItem | undefined;
              return (
                <div key={item.id} className="flex flex-col items-center gap-1.5 w-24">
                  <div className="relative w-full rounded-lg overflow-hidden" style={{aspectRatio: '2/3'}}>
                    {media?.cover_image_url ? (
                      <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs" style={{background: meta.color + '11'}}>{meta.emoji}</div>
                    )}
                    <div className="absolute top-1 left-1 bg-black/70 text-white font-mono text-xs font-bold w-5 h-5 flex items-center justify-center rounded">
                      {index + 1}
                    </div>
                  </div>
                  <div className="text-xs text-center font-medium truncate w-full">{media?.title || '...'}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl font-bold">Recentes</h2>
          <button onClick={() => toggleExpand('recentes')} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">
            {showExpanded.recentes ? 'Ver menos' : 'Ver todas'}
          </button>
        </div>
        {filteredLogs.length === 0 ? (
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma mídia registrada.</div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {(showExpanded.recentes ? filteredLogs : filteredLogs.slice(0, 12)).map(log => (
              <PosterTile key={log.id} log={log} fallbackEmoji={meta.emoji} color={meta.color} />
            ))}
          </div>
        )}
      </section>

      {STATUS_SECTIONS.map(({ id, label, status, emptyMsg }) => {
        const sectionLogs = filteredLogs.filter(l => l.status === status);
        const expanded = showExpanded[id];
        return (
          <section key={id}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-2xl font-bold">{label}</h2>
              {sectionLogs.length > 12 && (
                <button onClick={() => toggleExpand(id)} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">
                  {expanded ? 'Ver menos' : 'Ver todas'}
                </button>
              )}
            </div>
            {sectionLogs.length === 0 ? (
              <div className="mdf-card p-6 text-center text-white/30 text-sm">{emptyMsg}</div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {(expanded ? sectionLogs : sectionLogs.slice(0, 12)).map(log => (
                  <PosterTile key={log.id} log={log} fallbackEmoji={meta.emoji} color={meta.color} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {reviewEntries.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">Reviews</h2>
            <Link to={`/profile/${profileUser?.username}/reviews`} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">Ver todas</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {reviewEntries.slice(0, 10).map(e => (
              <Link key={e.review.id} to={'/log/' + e.log.id} className="mdf-card mdf-card-hover rounded-xl overflow-hidden transition-colors block group">
                <div className="flex">
                  <div className="relative flex-shrink-0 w-20" style={{aspectRatio: '2/3', borderBottom: '3px solid ' + (meta.color || '#666')}}>
                    {e.log.media_item.cover_image_url ? (
                      <img src={e.log.media_item.cover_image_url} alt="" className="w-full h-full rounded-none object-cover" loading="lazy"/>
                    ) : (
                      <div className="w-full h-full rounded-none flex items-center justify-center" style={{background: (meta.color || '#666') + '22'}}>
                        <span className="text-sm">{meta.emoji || '📄'}</span>
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
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl font-bold">Todos</h2>
          <button onClick={() => toggleExpand('all')} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">
            {showExpanded.all ? 'Ver menos' : 'Ver todas'}
          </button>
        </div>
        {filteredLogs.length === 0 ? (
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma mídia registrada.</div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {(showExpanded.all ? filteredLogs : filteredLogs.slice(0, 12)).map(log => (
              <PosterTile key={log.id} log={log} fallbackEmoji={meta.emoji} color={meta.color} />
            ))}
          </div>
        )}
      </section>

      {filteredCustomLists.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-2xl font-bold">Listas Personalizadas</h2>
            <Link to={`/profile/${profileUser?.username}/lists`} className="text-xs text-white/40 uppercase tracking-[0.2em] hover:text-white/60 transition-colors">Ver todas</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCustomLists.map(list => (
              <Link key={list.id} to={`/profile/${profileUser?.username}/lists`} className="mdf-card mdf-card-hover rounded-xl p-4 transition-colors block group">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg font-bold text-white/80 truncate">{list.name}</h3>
                  <span className="text-xs text-white/40 font-mono">{list.items.length} itens</span>
                </div>
                {list.description && (
                  <p className="text-sm text-white/40 line-clamp-2 mb-3">{list.description}</p>
                )}
                <div className="flex gap-1.5 overflow-hidden">
                  {list.items.slice(0, 8).map(item => (
                    <div key={item.id} className="w-12 h-18 rounded-md overflow-hidden flex-shrink-0" style={{aspectRatio: '2/3'}}>
                      {item.media_item?.cover_image_url ? (
                        <img src={item.media_item.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{background: (meta.color || '#666') + '22'}}>
                          {meta.emoji}
                        </div>
                      )}
                    </div>
                  ))}
                  {list.items.length > 8 && (
                    <div className="w-12 h-18 rounded-md flex items-center justify-center flex-shrink-0 text-xs text-white/40" style={{background: 'var(--bg-elevated)', aspectRatio: '2/3'}}>
                      +{list.items.length - 8}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MediaTypeProfilePage;
