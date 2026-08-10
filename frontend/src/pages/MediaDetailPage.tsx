import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLogUrl } from '../utils';
import api, { getMediaByApi } from '../services/api';
import type { LogEntry } from '../types';
import type { MediaItem } from '../types/media';
import { ChevronDown, Trash2, CheckCircle2, Circle, Pencil, Bookmark, Heart, Edit3, Star, Plus } from 'lucide-react';
import LogForm from '../components/LogForm';
import HashtagText from '../components/HashtagText';
import { TYPE_META, STATUS_COLORS } from '../constants/designSystem';
import Stars from '../components/Stars';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em progresso',
  completed: 'Completo',
  dropped: 'Abandonado',
  wishlist: 'Lista de desejos',
  soon: 'Em breve',
  platinated: 'Platinado',
  library: 'Biblioteca',
};

interface WatchedEpisode {
  id?: number;
  season_number: number;
  episode_number: number;
  episode_name?: string;
  watched: boolean;
  log_date?: string;
  review_text?: string;
  rating?: number;
}

interface TmdbEpisode {
  season_number: number;
  episode_number: number;
  name: string;
  air_date?: string;
  still_path?: string;
}

interface TmdbSeason {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string;
}

interface AchievementItem {
  id?: number;
  external_id: string;
  name: string;
  description?: string;
  image_url?: string;
  unlocked: boolean;
  unlock_percentage?: number | null;
}

interface CommunityReview {
  id: number;
  user_id: number;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  accent_color?: string | null;
  status: string;
  rating?: number | null;
  review?: string | null;
  log_date?: string | null;
  platform?: string | null;
}

interface MediaDetail extends MediaItem {
  id: number;
  has_log?: boolean;
  log_id?: number | null;
  user_log?: UserLog | null;
  community_reviews?: CommunityReview[];
  community_stats?: {
    total_logs: number;
    rating_count: number;
    average_rating?: number | null;
    distribution: { value: string; count: number }[];
    status_counts: Record<string, number>;
    platform_breakdown?: { platform: string; average_rating: number; count: number }[];
  };
  time_to_beat?: string | null;
  similar_games?: string | null;
}

interface UserLog {
  id: number;
  status: string;
  rating?: number | null;
  review?: string | null;
  log_date?: string | null;
  platform?: string | null;
  hours_spent?: number | null;
  pages_read?: number | null;
  is_favorite?: boolean;
  relog_count?: number;
}

const STATUS_TABS = ['completed', 'in_progress', 'dropped', 'wishlist', 'soon', 'platinated', 'library'];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-[3px] h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />
    <h3 className="font-display text-xl font-bold">{children}</h3>
  </div>
);

const MediaDetailPage = () => {
  const { mediaType, apiId } = useParams<{ mediaType: string; apiId: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [log, setLog] = useState<LogEntry | null>(null);  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteReviewConfirm, setShowDeleteReviewConfirm] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [activeTab, setActiveTab] = useState('sobre');

  const [seasons, setSeasons] = useState<TmdbSeason[]>([]);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, TmdbEpisode[]>>({});
  const [watchedMap, setWatchedMap] = useState<Record<string, WatchedEpisode>>({});

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [achLoading, setAchLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [wishlistLogId, setWishlistLogId] = useState<number | null>(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [editingEpReview, setEditingEpReview] = useState<string | null>(null);
  const [epReviewText, setEpReviewText] = useState('');
  const [epReviewRating, setEpReviewRating] = useState(0);

  const fetchLog = useCallback(async () => {
    if (!mediaType || !apiId) return;
    setLoading(true);
    setLog(null);
    setSeasons([]);
    setOpenSeason(null);
    setEpisodes({});
    setWatchedMap({});
    setAchievements([]);
    setBookmarked(false);
    setWishlistLogId(null);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const byApi = await getMediaByApi(mediaType, apiId, user.id);
      const md = byApi.data;
      setMedia(md);

      if (md.has_log && md.log_id) {
        const logRes = await api.get('/media/logs/by-item', { params: { user_id: user.id, media_type: mediaType, api_id: apiId } });
        const logData = logRes.data;
        setLog(logData);

        if (logData.media_item.media_type === 'series' && logData.media_item.tmdb_id) {
          const tmdbId = logData.media_item.tmdb_id;
          api.get(`/media/series/${tmdbId}/seasons`).then(async r => {
            const sList = r.data || [];
            setSeasons(sList);
            const allEpisodes: Record<number, TmdbEpisode[]> = {};
            await Promise.all(sList.map(async (s: TmdbSeason) => {
              try {
                const epRes = await api.get(`/media/series/${tmdbId}/season/${s.season_number}/episodes`);
                allEpisodes[s.season_number] = epRes.data || [];
              } catch { allEpisodes[s.season_number] = []; }
            }));
            setEpisodes(allEpisodes);
          }).catch(() => {});
          api.get(`/media/logs/${logData.id}/episodes`).then(r => {
            const map: Record<string, WatchedEpisode> = {};
            (r.data || []).forEach((ep: WatchedEpisode) => { map[ep.season_number + '-' + ep.episode_number] = ep; });
            setWatchedMap(map);
          }).catch(() => {});
        }
        if (logData.media_item.media_type === 'game' && logData.media_item.igdb_id) {
          setAchLoading(true);
          api.get(`/media/games/${logData.media_item.igdb_id}/achievements`).then(r => {
            const remote = r.data || [];
            api.get(`/media/logs/${logData.id}/achievements`).then(r2 => {
              const saved = r2.data || [];
              const savedMap = new Map<string, AchievementItem>(saved.map((a: AchievementItem) => [a.external_id, a]));
              setAchievements(remote.map((a: Record<string, unknown>) => ({
                external_id: String(a.external_id || a.name || ''),
                name: a.name as string,
                description: (a.description as string) || '',
                image_url: (a.image_url as string) || '',
                unlock_percentage: a.unlock_percentage != null ? Number(a.unlock_percentage) : null,
                unlocked: savedMap.get(String(a.external_id || a.name || ''))?.unlocked || false,
              })));
            });
          }).catch(() => {}).finally(() => setAchLoading(false));
        }

        api.get('/media/wishlist', { params: { user_id: logData.user_id, media_type: logData.media_item.media_type } })
          .then(r => {
            const match = (r.data || []).find((w: any) => {
              const wid = w.media_item_id ?? w.media_item?.id;
              return Number(wid) === Number(logData.media_item_id);
            });
            setBookmarked(!!match);
            setWishlistLogId(match?.id ?? null);
          }).catch(() => {});
      }
    } catch { setLog(null); } finally { setLoading(false); }
  }, [mediaType, apiId]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const handleToggleFavorite = async () => {
    if (!log) return;
    const newValue = !log.is_favorite;
    setLog({ ...log, is_favorite: newValue });
    try {
      const { data } = await api.patch('/media/logs/' + log.id, { is_favorite: newValue });
      setLog(data);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      setLog({ ...log, is_favorite: !newValue });
    }
  };

  const handleBookmark = async () => {
    if (!log || bookmarking) return;
    setBookmarking(true);
    try {
      if (bookmarked && wishlistLogId) {
        await api.delete(`/media/logs/${wishlistLogId}`);
        setBookmarked(false);
        setWishlistLogId(null);
      } else {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const response = await api.post('/media/logs', {
          log_in: {
            media_item: log.media_item,
            status: 'wishlist',
            log_date: new Date().toISOString(),
          },
          user_id: currentUser.id,
        });
        setBookmarked(true);
        setWishlistLogId(response.data?.id ?? null);
      }
    } catch (err) {
      console.error('Failed to toggle wishlist', err);
    } finally {
      setBookmarking(false);
    }
  };

  const handleEditSubmit = async (logDetails: any) => {
    if (!log) return;
    try {
      const { data } = await api.put(`/media/logs/${log.id}`, logDetails);
      setLog(data);
      setShowEditModal(false);
      if (String(data.id) !== String(log.id)) {
        navigate(getLogUrl(data.media_item), { replace: true });
      }
    } catch (error) {
      console.error('Failed to update log', error);
    }
  };

  const handleDelete = async () => {
    if (!log) return;
    setDeleting(true);
    try { await api.delete('/media/logs/' + log.id); navigate('/'); }
    catch { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const handleDeleteReview = async () => {
    if (!log) return;
    setDeletingReview(true);
    try {
      const { data } = await api.delete(`/media/logs/${log.id}/review`);
      setLog(data);
      setShowDeleteReviewConfirm(false);
    } catch (err) {
      console.error('Failed to delete review:', err);
    } finally {
      setDeletingReview(false);
    }
  };

  const loadSeason = async (n: number) => {
    if (episodes[n]) { setOpenSeason(openSeason === n ? null : n); return; }
    if (!log?.media_item.tmdb_id) return;
    const { data } = await api.get('/media/series/' + log.media_item.tmdb_id + '/season/' + n + '/episodes');
    setEpisodes({ ...episodes, [n]: data });
    setOpenSeason(n);
  };

  const toggleEpisode = async (ep: TmdbEpisode) => {
    if (!log) return;
    if (ep.air_date && new Date(ep.air_date) > new Date()) return;
    const key = ep.season_number + '-' + ep.episode_number;
    const current = watchedMap[key];
    const newWatched = current ? !current.watched : true;
    try {
      const { data } = await api.post('/media/logs/' + log.id + '/episodes', {
        season_number: ep.season_number, episode_number: ep.episode_number,
        episode_name: ep.name, watched: newWatched, log_date: new Date().toISOString().split('T')[0],
        air_date: ep.air_date,
      });
      setWatchedMap({ ...watchedMap, [key]: data });
      if (log) {
        setLog({
          ...log,
          watched_episodes: (log.watched_episodes || 0) + (newWatched ? 1 : -1)
        });
      }
    } catch (err) {
      console.error('Failed to toggle episode:', err);
    }
  };

  const saveEpReview = async (epKey: string) => {
    const ep = watchedMap[epKey];
    if (!ep?.id) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const { data } = await api.put(`/media/episodes/${ep.id}/review`, {
        review_text: epReviewText || null,
        rating: epReviewRating || null,
      }, { params: { user_id: currentUser.id } });
      setWatchedMap({ ...watchedMap, [epKey]: { ...ep, ...data } });
      setEditingEpReview(null);
    } catch (err) {
      console.error('Failed to save episode review:', err);
    }
  };

  const startEditEpReview = (epKey: string) => {
    const ep = watchedMap[epKey];
    setEpReviewText(ep?.review_text || '');
    setEpReviewRating(ep?.rating || 0);
    setEditingEpReview(epKey);
  };

  const toggleAllEpisodes = async (seasonEps: TmdbEpisode[], markWatched: boolean) => {
    if (!log) return;
    const newMap = { ...watchedMap };
    let watchedChange = 0;
    const today = new Date();
    const requests: Promise<void>[] = [];
    for (const ep of seasonEps) {
      if (markWatched && ep.air_date && new Date(ep.air_date) > today) continue;
      const key = ep.season_number + '-' + ep.episode_number;
      const isCurrentlyWatched = !!newMap[key]?.watched;
      if (isCurrentlyWatched === markWatched) continue;
      watchedChange += markWatched ? 1 : -1;
      newMap[key] = {
        season_number: ep.season_number,
        episode_number: ep.episode_number,
        episode_name: ep.name,
        watched: markWatched,
      };
      requests.push(
        api.post('/media/logs/' + log.id + '/episodes', {
          season_number: ep.season_number, episode_number: ep.episode_number,
          episode_name: ep.name, watched: markWatched, log_date: new Date().toISOString().split('T')[0],
          air_date: ep.air_date,
        }).then(({ data }) => {
          newMap[key] = data;
        }).catch((err) => {
          console.error('Failed to toggle episode:', err);
        })
      );
    }
    setWatchedMap(newMap);
    setLog(prev => prev ? { ...prev, watched_episodes: (prev.watched_episodes || 0) + watchedChange } : prev);
    await Promise.all(requests);
    setWatchedMap({ ...newMap });
  };

  const toggleAch = async (a: AchievementItem) => {
    if (!log) return;
    const newUnlocked = !a.unlocked;
    const { data } = await api.post('/media/logs/' + log.id + '/achievements', {
      external_id: a.external_id, name: a.name, description: a.description || '',
      image_url: a.image_url || '', unlocked: newUnlocked,
    });
    setAchievements(achievements.map(x => x.external_id === a.external_id ? { ...x, unlocked: newUnlocked, id: data.id } : x));
  };

  const toggleAllAch = async (markUnlocked: boolean) => {
    if (!log) return;
    for (const a of achievements) {
      if (a.unlocked !== markUnlocked) {
        await api.post('/media/logs/' + log.id + '/achievements', {
          external_id: a.external_id, name: a.name, description: a.description || '',
          image_url: a.image_url || '', unlocked: markUnlocked,
        });
      }
    }
    setAchievements(achievements.map(x => ({ ...x, unlocked: markUnlocked })));
  };

  if (loading) return <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>;
  if (!media) return <div className="mdf-card p-8 text-center text-white/50">Nenhuma mídia encontrada.</div>;

  const md = media;
  const meta = TYPE_META[md.media_type] || TYPE_META.game;
  const isSeries = md.media_type === 'series';
  const isGame = md.media_type === 'game';
  const isBook = md.media_type === 'book';
  const totalEps = seasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || (log?.total_episodes || 0);
  const watchedCount = log?.watched_episodes || 0;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  let timeToBeat: { hastily?: number; normally?: number; completely?: number } | null = null;
  try { timeToBeat = md.time_to_beat ? JSON.parse(md.time_to_beat) : null; } catch { timeToBeat = null; }

  let similarGames: { id: number; name: string; cover_image_url?: string }[] = [];
  try { similarGames = md.similar_games ? JSON.parse(md.similar_games) : []; } catch { similarGames = []; }

  let screenshots: string[] = [];
  try { screenshots = md.screenshots ? JSON.parse(md.screenshots) : []; } catch { screenshots = []; }

  const tabs = [
    { id: 'sobre', label: 'Sobre' },
    ...(isSeries ? [{ id: 'episodes', label: 'Episódios' }] : []),
    ...(isGame ? [{ id: 'achievements', label: `Conquistas${achievements.length ? ` (${achievements.length})` : ''}` }] : []),
    { id: 'reviews', label: 'Reviews' },
    ...(screenshots.length > 0 ? [{ id: 'screenshots', label: 'Screenshots' }] : []),
  ];

  const backdrop = isGame ? (md.header_image || screenshots[0]) : md.backdrop_url;
  const stats = md.community_stats;

  const barValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const barCounts: Record<number, number> = {};
  (stats?.distribution || []).forEach(d => { barCounts[Number(d.value)] = d.count; });
  const maxBarCount = Math.max(1, ...barValues.map(v => barCounts[v] || 0));

  const formatHours = (sec?: number | null): string | null => {
    if (!sec) return null;
    return (sec / 3600).toFixed(0) + 'h';
  };

  return (
    <div className="mx-auto" style={{ maxWidth: '1500px' }}>
      <Link to="/" className="mdf-btn-ghost text-sm inline-flex items-center gap-2 mb-5">
        <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
        Voltar
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          {/* Header */}
          <div className="mdf-card overflow-hidden">
            {backdrop && (
              <div className="relative h-44 sm:h-56 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <img src={backdrop} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-elevated) 0%, transparent 60%)' }} />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 p-4 sm:p-6" style={{ paddingTop: backdrop ? '-2rem' : undefined }}>
              <div className="flex-shrink-0 w-28 sm:w-[200px] self-center sm:self-start">
                {md.cover_image_url ? (
                  <img src={md.cover_image_url} alt={md.title} className="w-full h-auto object-cover rounded-xl" style={{ aspectRatio: '2/3', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }} />
                ) : (
                  <div className="w-full flex items-center justify-center rounded-xl" style={{ background: meta.color + '22', aspectRatio: '2/3' }}>
                    <span className="text-5xl">{meta.emoji}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: meta.color + '22', color: meta.color }}>{meta.label}</span>
                  {log?.status && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: STATUS_COLORS[log.status] || 'rgba(168,85,247,0.2)', color: '#fff' }}>
                      {STATUS_LABELS[log.status] || log.status}
                    </span>
                  )}
                  {log?.is_relog && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>Rejogado</span>}
                  {log?.is_favorite && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(250,51,128,0.2)', color: '#FA3380' }}>♥ Favorito</span>}
                  {log?.status === 'platinated' && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}>Platinado</span>}
                </div>

                <h1 className="font-display text-3xl font-black tracking-tight mb-3">{md.title}</h1>

                <div className="flex items-center gap-4 text-sm text-white/50 mb-3 flex-wrap">
                  {md.genres && <span className="text-white/40">{md.genres}</span>}
                  {md.director && <span>{md.media_type === 'movie' ? 'Dir. ' : ''}{md.director}</span>}
                  {md.release_date && <span>{String(md.release_date)}</span>}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  {isGame && md.metacritic_score != null && (
                    <span className="px-2.5 py-1 rounded text-xs font-bold" style={{ background: md.metacritic_score >= 75 ? 'var(--accent-bg)' : md.metacritic_score >= 50 ? 'rgba(250,204,21,0.2)' : 'rgba(239,68,68,0.2)', color: md.metacritic_score >= 75 ? 'var(--accent)' : md.metacritic_score >= 50 ? '#fbbf24' : '#ef4444' }}>
                      Metacritic {md.metacritic_score}
                    </span>
                  )}
                  {md.vote_average != null && md.vote_average > 0 && (
                    <span className="px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1" style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}>
                      <Star size={12} fill="#fbbf24" /> {md.vote_average.toFixed(1)}
                    </span>
                  )}
                  {isBook && md.book_rating != null && md.book_rating > 0 && (
                    <span className="px-2.5 py-1 rounded text-xs font-bold" style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}>
                      Google Books {md.book_rating.toFixed(1)}
                    </span>
                  )}
                  {isGame && md.steam_price && <span className="text-sm text-[var(--mdf-green)] font-bold">{md.steam_price}</span>}
                </div>

                <div className="flex items-center gap-6 text-sm text-white/50 mb-4 flex-wrap">
                  {isSeries && totalEps > 0 && <div><span className="text-white/30">Episódios:</span> <span className="text-white/70 font-bold">{watchedCount}/{totalEps}</span></div>}
                  {isGame && achievements.length > 0 && <div><span className="text-white/30">Conquistas:</span> <span className="text-white/70 font-bold">{unlockedCount}/{achievements.length}</span></div>}
                  {isBook && md.page_count != null && md.page_count > 0 && <div><span className="text-white/30">Páginas:</span> <span className="text-white/70">{md.page_count}</span></div>}
                  {md.runtime != null && md.runtime > 0 && !isSeries && <div><span className="text-white/30">Duração:</span> <span className="text-white/70">{md.runtime} min</span></div>}
                  {log?.platform && <div><span className="text-white/30">Plataforma:</span> <span className="text-white/70">{log.platform}</span></div>}
                  {log?.hours_spent != null && log.hours_spent > 0 && <div><span className="text-white/30">Horas:</span> <span className="text-white/70">{log.hours_spent}h</span></div>}
                  {(log?.relog_count ?? 0) > 0 && <div><span className="text-white/30">Visto:</span> <span className="text-white/70 font-bold">{(log.relog_count ?? 0) + 1}x</span></div>}
                </div>

                {md.synopsis && <p className="text-sm text-white/60 leading-relaxed mb-4">{md.synopsis}</p>}

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  {log ? (
                    <>
                      <button onClick={() => setShowEditModal(true)} className="mdf-btn-primary text-sm inline-flex items-center gap-2">
                        <Pencil size={14} /> Editar log
                      </button>
                      <button onClick={() => setShowDeleteConfirm(true)} className="mdf-btn-ghost text-sm inline-flex items-center gap-2 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 size={14} /> Excluir
                      </button>
                      <button onClick={handleToggleFavorite}
                        className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
                        style={{
                          borderColor: log.is_favorite ? 'rgba(250,51,128,0.6)' : 'rgba(255,255,255,0.1)',
                          background: log.is_favorite ? 'rgba(250,51,128,0.15)' : 'transparent',
                          color: log.is_favorite ? '#FA3380' : 'rgba(255,255,255,0.6)',
                        }}
                        title={log.is_favorite ? 'Remover dos favoritos' : 'Favoritar'}>
                        <Heart size={14} fill={log.is_favorite ? '#FA3380' : 'none'} />
                      </button>
                      {log.status === 'completed' && (
                        <button onClick={handleBookmark} disabled={bookmarking}
                          className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
                          style={{
                            borderColor: bookmarked ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)',
                            background: bookmarked ? 'rgba(168,85,247,0.15)' : 'transparent',
                            color: bookmarked ? '#a855f7' : 'rgba(255,255,255,0.6)',
                          }}
                          title={bookmarked ? 'Remover da lista de desejos' : 'Pretendo reassistir/rejogar'}>
                          <Bookmark size={14} fill={bookmarked ? '#a855f7' : 'none'} />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => navigate('/new-log', { state: { media: md } })}
                      className="mdf-btn-primary text-sm inline-flex items-center gap-2"
                    >
                      <Plus size={16} /> Adicionar ao diário
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User log block */}
          {log && (
            <div className="mdf-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-[3px] h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />
                <h3 className="font-display text-lg font-bold">Meu log</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: STATUS_COLORS[log.status] || 'rgba(255,255,255,0.1)', color: '#fff' }}>
                  {STATUS_LABELS[log.status] || log.status}
                </span>
                {log.is_favorite && <span className="text-xs text-red-400">♥</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50 mb-3">
                {log.rating != null && log.rating > 0 && (
                  <div className="flex items-center gap-1" style={{ color: '#fbbf24' }}>
                    <Stars rating={log.rating} size={14} />
                    <span className="ml-1 text-white/60 font-mono">{log.rating.toFixed(1)}</span>
                  </div>
                )}
                {log.log_date && <div>Quando: <span className="text-white/70">{log.log_date.split('T')[0]}</span></div>}
                {log.platform && <div>Plataforma: <span className="text-white/70">{log.platform}</span></div>}
                {log.hours_spent != null && log.hours_spent > 0 && <div>Horas: <span className="text-white/70">{log.hours_spent}h</span></div>}
                {isBook && <div>Páginas: <span className="text-white/70">{log.pages_read ?? '-'}</span></div>}
              </div>
              {log.review && (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap"><HashtagText text={log.review} /></p>
                  <button
                    onClick={() => setShowDeleteReviewConfirm(true)}
                    className="flex-shrink-0 text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 text-white/40 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Apagar review"
                  >
                    <Trash2 size={11} /> Apagar review
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors relative"
                style={{ color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.4)' }}
              >
                {t.label}
                {activeTab === t.id && (
                  <div className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Sobre */}
          {activeTab === 'sobre' && (
            <div className="space-y-6">
              <div>
                <SectionTitle>Sobre</SectionTitle>
                {md.synopsis && <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{md.synopsis}</p>}
                {!md.synopsis && md.short_description && (
                  <p className="text-sm text-white/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: md.short_description }} />
                )}
              </div>

              {md.trailer_url && (
                <a href={md.trailer_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[var(--mdf-green)] hover:underline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Assistir trailer
                </a>
              )}

              {stats && stats.total_logs > 0 && (
                <div>
                  <SectionTitle>Estatísticas da comunidade</SectionTitle>
                  <div className="mdf-card p-5">
                    <div className="space-y-2.5">
                      {STATUS_TABS.filter(s => (stats.status_counts[s] || 0) > 0).map(s => {
                        const count = stats.status_counts[s] || 0;
                        const pct = (count / stats.total_logs) * 100;
                        return (
                          <div key={s} className="flex items-center gap-3">
                            <span className="w-24 text-xs text-white/50 flex-shrink-0">{STATUS_LABELS[s] || s}</span>
                            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: STATUS_COLORS[s] || '#666' }} />
                            </div>
                            <span className="w-8 text-xs text-white/40 text-right tabular-nums">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Steam / Media / Book info */}
              {isGame && md.steam_appid && (
                <div>
                  <SectionTitle>Dados do jogo</SectionTitle>
                  <div className="mdf-card p-4 space-y-3">
                    {md.steam_genres && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Gêneros</div>
                        <div className="flex flex-wrap gap-1.5">
                          {md.steam_genres.split(', ').map(g => (
                            <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {md.steam_categories && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Modos de Jogo</div>
                        <div className="flex flex-wrap gap-1.5">
                          {md.steam_categories.split(', ').map(c => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(md.media_type === 'movie' || md.media_type === 'series') && (md.cast || md.runtime != null) && (
                <div>
                  <SectionTitle>{md.media_type === 'movie' ? 'Dados do filme' : 'Dados da série'}</SectionTitle>
                  <div className="mdf-card p-4 space-y-3">
                    {md.director && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">{md.media_type === 'movie' ? 'Diretor' : 'Criador'}</div>
                        <div className="text-sm text-white/70">{md.director}</div>
                      </div>
                    )}
                    {md.cast && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Elenco</div>
                        <div className="text-sm text-white/70">{md.cast}</div>
                      </div>
                    )}
                    {md.genres && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Gêneros</div>
                        <div className="flex flex-wrap gap-1.5">
                          {md.genres.split(', ').map(g => (
                            <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isBook && (md.publisher || md.page_count != null || md.book_categories || md.book_language) && (
                <div>
                  <SectionTitle>Dados do livro</SectionTitle>
                  <div className="mdf-card p-4 space-y-3">
                    {md.publisher && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Editora</div>
                        <div className="text-sm text-white/70">{md.publisher}</div>
                      </div>
                    )}
                    <div className="flex gap-6 text-sm">
                      {md.page_count != null && md.page_count > 0 && (
                        <div><span className="text-white/30">Páginas:</span> <span className="text-white/70">{md.page_count}</span></div>
                      )}
                      {md.book_language && (
                        <div><span className="text-white/30">Idioma:</span> <span className="text-white/70 uppercase">{md.book_language}</span></div>
                      )}
                    </div>
                    {md.book_categories && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Categorias</div>
                        <div className="flex flex-wrap gap-1.5">
                          {md.book_categories.split(', ').map(c => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Episodes */}
          {activeTab === 'episodes' && isSeries && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Episódios</SectionTitle>
                {totalEps > 0 && <div className="text-xs text-white/40 font-mono">{Math.min(watchedCount, totalEps)}/{totalEps} episódios</div>}
              </div>
              {seasons.length === 0 ? (
                <div className="mdf-card p-6 text-center text-white/50 text-sm">
                  {log ? 'Sem temporadas disponíveis.' : 'Adicione esta série ao diário para marcar episódios.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {seasons.map(s => {
                    const eps = episodes[s.season_number] || [];
                    const today = new Date();
                    const released = eps.filter(e => !e.air_date || new Date(e.air_date) <= today).length;
                    const sWatched = Object.values(watchedMap).filter(e => e.season_number === s.season_number && e.watched).length;
                    const total = s.episode_count || 0;
                    const pct = total > 0 ? (sWatched / total) * 100 : 0;
                    return (
                      <div key={s.season_number} className="mdf-card overflow-hidden">
                        <button onClick={() => loadSeason(s.season_number)}
                          className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors">
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{s.name}</div>
                            <div className="text-xs text-white/50 mt-0.5">{s.episode_count} episódios</div>
                          </div>
                          <div className="flex-1 max-w-[200px]">
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full bg-[var(--mdf-green)] transition-all" style={{ width: pct + '%' }} />
                            </div>
                            <div className="text-[10px] text-white/40 text-right mt-1 font-mono">
                              {sWatched}/{released}
                            </div>
                          </div>
                          {log && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                let seasonEps = eps;
                                if (seasonEps.length === 0 && log?.media_item.tmdb_id) {
                                  const { data } = await api.get('/media/series/' + log.media_item.tmdb_id + '/season/' + s.season_number + '/episodes');
                                  setEpisodes(prev => ({ ...prev, [s.season_number]: data }));
                                  seasonEps = data || [];
                                }
                                const rel = seasonEps.filter(ep => !ep.air_date || new Date(ep.air_date) <= today).length;
                                toggleAllEpisodes(seasonEps, sWatched < rel);
                              }}
                              className="flex-shrink-0"
                            >
                              {sWatched === released && released > 0
                                ? <CheckCircle2 size={20} style={{ color: 'var(--mdf-green)' }} />
                                : <Circle size={20} className="text-white/30 hover:text-white/50 transition-colors" />}
                            </button>
                          )}
                          <ChevronDown size={16} className={`text-white/40 transition-transform ${openSeason === s.season_number ? 'rotate-180' : ''}`} />
                        </button>
                        {openSeason === s.season_number && eps.length > 0 && (
                          <div className="border-t border-white/5 divide-y divide-white/5">
                            {eps.map(ep => {
                              const key = ep.season_number + '-' + ep.episode_number;
                              const watched = watchedMap[key]?.watched || false;
                              const isFuture = !!ep.air_date && new Date(ep.air_date) > today;
                              const isEditing = editingEpReview === key;
                              const epData = watchedMap[key];
                              return (
                                <div key={ep.episode_number}>
                                  <div className={`flex items-center gap-3 px-4 py-3 ${isFuture ? 'opacity-40' : ''}`}>
                                    {log && (
                                      <button onClick={() => toggleEpisode(ep)} disabled={isFuture} className="flex-shrink-0">
                                        {watched ? <CheckCircle2 size={20} style={{ color: 'var(--mdf-green)' }} /> :
                                         isFuture ? <Circle size={20} className="text-white/20" /> :
                                         <Circle size={20} className="text-white/30 hover:text-white/50 transition-colors" />}
                                      </button>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm">
                                        <span className="text-white/40 font-mono mr-2 text-xs">S{String(ep.season_number).padStart(2, '0')}E{String(ep.episode_number).padStart(2, '0')}</span>
                                        <span className="font-semibold">{ep.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        {ep.air_date && <span className="text-white/40">Lançado: {ep.air_date}</span>}
                                        {watched && epData?.log_date && <span className="text-white/30">Assistido: {epData.log_date}</span>}
                                        {isFuture && <span className="text-yellow-500/60">Não lançado</span>}
                                      </div>
                                    </div>
                                    {log && watched && !isFuture && (
                                      <button onClick={() => startEditEpReview(key)}
                                        className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors">
                                        {epData?.review_text || epData?.rating ? <Edit3 size={14} style={{ color: 'var(--mdf-yellow)' }} /> : <Edit3 size={14} />}
                                      </button>
                                    )}
                                  </div>
                                  {isEditing && (
                                    <div className="px-4 pb-3 pt-0 space-y-2">
                                      <div className="flex items-center gap-1 text-sm">
                                        {[1, 2, 3, 4, 5].map(i => (
                                          <button key={i} type="button" onClick={() => setEpReviewRating(i)}
                                            className="transition-colors" style={{ color: i <= epReviewRating ? 'var(--mdf-yellow)' : 'var(--border)' }}>
                                            <Star size={14} fill={i <= epReviewRating ? 'var(--mdf-yellow)' : 'none'} />
                                          </button>
                                        ))}
                                        {epReviewRating > 0 && <span className="text-xs text-white/40 ml-1">{epReviewRating}/5</span>}
                                      </div>
                                      <textarea
                                        value={epReviewText}
                                        onChange={e => setEpReviewText(e.target.value)}
                                        placeholder="Review do episódio..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white/80 outline-none resize-none"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button onClick={() => saveEpReview(key)}
                                          className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                                          Salvar
                                        </button>
                                        <button onClick={() => setEditingEpReview(null)}
                                          className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/70">
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Achievements */}
          {activeTab === 'achievements' && isGame && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <SectionTitle>Conquistas</SectionTitle>
                {achievements.length > 0 && (
                  <span className="text-sm text-white/60 font-mono">{unlockedCount}/{achievements.length}</span>
                )}
              </div>
              {achLoading && <div className="text-white/50 text-sm">Carregando conquistas...</div>}
              {!achLoading && achievements.length === 0 && (
                <div className="mdf-card p-6 text-center text-white/50 text-sm">
                  {log ? 'Sem conquistas encontradas para este jogo.' : 'Adicione este jogo ao diário para acompanhar suas conquistas.'}
                </div>
              )}
              {achievements.length > 0 && (
                <>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-4">
                    <div className="h-full rounded-full bg-[var(--mdf-yellow)] transition-all" style={{ width: (unlockedCount / achievements.length) * 100 + '%' }} />
                  </div>
                  {log && achievements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleAllAch(unlockedCount < achievements.length)}
                      className="text-xs px-3 py-1.5 rounded-lg mb-4 font-bold inline-flex items-center gap-1.5"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
                    >
                      {unlockedCount === achievements.length ? <CheckCircle2 size={14} style={{ color: 'var(--mdf-green)' }} /> : <Circle size={14} />}
                      {unlockedCount === achievements.length ? 'Todas desbloqueadas' : 'Desbloquear todas'}
                    </button>
                  )}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {achievements.map(a => (
                      <button key={a.external_id} onClick={log ? () => toggleAch(a) : undefined}
                        className={`mdf-card p-3 flex items-center gap-3 text-left transition-colors ${a.unlocked ? 'border border-[var(--mdf-green)]/30 bg-[var(--mdf-green)]/5' : log ? 'hover:bg-white/5' : ''}`}>
                        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-white/5">
                          {a.image_url && <img src={a.image_url} alt="" className={`w-full h-full object-cover ${!a.unlocked ? 'grayscale opacity-50' : ''}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold truncate ${a.unlocked ? 'text-white' : 'text-white/60'}`}>{a.name}</div>
                          {a.description && <div className="text-xs text-white/50 truncate">{a.description}</div>}
                          {!a.description && a.unlock_percentage != null && (
                            <div className="text-xs text-white/40">{a.unlock_percentage}% dos jogadores</div>
                          )}
                        </div>
                        {a.unlocked && <CheckCircle2 size={18} style={{ color: 'var(--mdf-green)' }} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {md.community_reviews && md.community_reviews.length > 0 && (
                <div>
                  <SectionTitle>Reviews da comunidade</SectionTitle>
                  <div className="space-y-2">
                    {md.community_reviews.map(r => (
                      <div key={r.id} className="mdf-card p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Link to={`/profile/${r.username}`} className="flex items-center gap-2 min-w-0">
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: r.accent_color || 'var(--accent)', color: '#000' }}>
                                {(r.display_name || r.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-semibold text-white truncate">{r.display_name || r.username}</span>
                          </Link>
                          {r.rating != null && r.rating > 0 && (
                            <span className="flex items-center gap-0.5" style={{ color: '#fbbf24' }}>
                              <Stars rating={r.rating} size={12} />
                            </span>
                          )}
                          {r.log_date && <span className="text-xs text-white/40 ml-auto flex-shrink-0">{r.log_date.split('T')[0]}</span>}
                        </div>
                        {r.review && <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap"><HashtagText text={r.review} /></p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!md.community_reviews || md.community_reviews.length === 0) && (
                <div className="mdf-card p-6 text-center text-white/50 text-sm">Nenhuma review ainda.</div>
              )}
            </div>
          )}

          {/* Screenshots */}
          {activeTab === 'screenshots' && screenshots.length > 0 && (
            <div>
              <SectionTitle>Screenshots</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {screenshots.map((src: string, i: number) => (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="rounded-lg overflow-hidden block hover:opacity-80 transition-opacity">
                    <img src={src} alt="" className="w-full h-auto object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* YGP Right sidebar */}
        <aside className="lg:sticky lg:top-0">
          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
            {/* Avaliações */}
            <div className="flex flex-col gap-4 px-5 py-6">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="block h-4 w-[3px] rounded-sm" style={{ background: 'var(--accent)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Avaliações</h3>
              </div>
              {stats && stats.rating_count > 0 && stats.average_rating != null ? (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl font-bold" style={{ color: 'var(--text)' }}>{stats.average_rating.toFixed(1)}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => {
                        const pct = Math.max(0, Math.min(100, (stats.average_rating - (i - 1)) * 100));
                        return (
                          <div key={i} className="relative h-4 w-4">
                            <Star size={16} className="absolute inset-0 text-white/20" fill="none" />
                            <div className="absolute inset-0 overflow-hidden" style={{ width: pct + '%' }}>
                              <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-xs text-white/40">{stats.rating_count} avaliações</span>
                  </div>
                  <div>
                    <div className="flex items-end gap-[2px]" style={{ height: 56 }}>
                      {barValues.map(v => {
                        const cnt = barCounts[v] || 0;
                        const pct = (cnt / maxBarCount) * 100;
                        return (
                          <div key={v} className="flex flex-1 flex-col justify-end" title={`${v}★ — ${cnt}`}>
                            <div className="w-full rounded-t-sm transition-all duration-700 ease-out" style={{ height: `max(3px, ${pct}%)`, background: 'var(--accent)' }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex items-center justify-between px-0.5">
                      <span className="flex items-center gap-0.5 text-[10px] font-medium tabular-nums text-white/70">
                        1<Star size={10} fill="#FFD24A" color="#FFD24A" />
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] font-medium tabular-nums text-white/70">
                        5<Star size={10} fill="#FFD24A" color="#FFD24A" />
                      </span>
                    </div>
                  </div>
                  {stats.platform_breakdown && stats.platform_breakdown.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {stats.platform_breakdown.map(p => (
                        <button key={p.platform} title={p.platform} className="flex items-center gap-1.5 rounded-sm border px-2 py-1 transition-colors hover:opacity-80" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-[10px] text-white/50 max-w-[70px] truncate">{p.platform}</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-white">
                            <Star size={10} fill="#FFD24A" color="#FFD24A" />{p.average_rating.toFixed(1)}
                          </span>
                          <span className="text-[10px] tabular-nums text-white/40">({p.count})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-white/40 py-2">Sem avaliações ainda. Seja o primeiro a avaliar!</div>
              )}
            </div>

            {/* Tempo para Zerar */}
            {isGame && timeToBeat && (timeToBeat.hastily || timeToBeat.normally || timeToBeat.completely) && (
              <div className="flex flex-col gap-3 px-5 py-6">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="block h-4 w-[3px] rounded-sm" style={{ background: 'var(--accent)' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Tempo para Zerar</h3>
                </div>
                <div className="flex flex-col">
                  {[
                    { label: 'História Principal', value: formatHours(timeToBeat.hastily) },
                    { label: 'Principal + Extra', value: formatHours(timeToBeat.normally) },
                    { label: 'Completista', value: formatHours(timeToBeat.completely) },
                  ].map(row => (
                    <div key={row.label} className="flex flex-col py-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-white/50">{row.label}</span>
                        <span className="text-sm font-semibold tabular-nums text-white">{row.value ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jogos similares */}
            {isGame && similarGames.length > 0 && (
              <div className="flex flex-col gap-3 px-5 py-6">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="block h-4 w-[3px] rounded-sm" style={{ background: 'var(--accent)' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Jogos similares</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {similarGames.slice(0, 4).map(g => (
                    <Link key={g.id} to={`/media/game/${g.id}`} title={g.name} className="group block">
                      <div className="aspect-[3/4] bg-white/35 p-px shadow-md shadow-black/50 transition-transform group-hover:scale-[1.03]">
                        <div className="h-full w-full overflow-hidden bg-white/10">
                          {g.cover_image_url ? (
                            <img src={g.cover_image_url} alt={g.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-center text-[10px] text-white/50 p-1 bg-white/5">{g.name}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Edit Modal */}
      {showEditModal && log && (
        <LogForm
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
          initialData={log}
          mediaItem={log.media_item}
          isEditing={true}
        />
      )}

      {/* Delete modal */}
      {showDeleteConfirm && log && createPortal(
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Excluir log</h3>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir o log de <strong>{md.title}</strong>?</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(false)} className="mdf-btn-ghost text-sm" disabled={deleting}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="text-sm py-2 px-4 rounded-xl font-bold" style={{ background: 'var(--error)', color: '#fff' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete review modal */}
      {showDeleteReviewConfirm && log && createPortal(
        <div className="modal-overlay" onClick={() => !deletingReview && setShowDeleteReviewConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Apagar review</h3>
              <button className="modal-close" onClick={() => !deletingReview && setShowDeleteReviewConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja apagar o review de <strong>{md.title}</strong>?</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>O texto do review e o histórico serão removidos.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteReviewConfirm(false)} className="mdf-btn-ghost text-sm" disabled={deletingReview}>Cancelar</button>
              <button onClick={handleDeleteReview} disabled={deletingReview}
                className="text-sm py-2 px-4 rounded-xl font-bold" style={{ background: 'var(--error)', color: '#fff' }}>
                {deletingReview ? 'Apagando...' : 'Apagar review'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MediaDetailPage;
