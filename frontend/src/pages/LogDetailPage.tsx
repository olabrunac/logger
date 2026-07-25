import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, LogReview } from '../types';
import { ChevronDown, Trash2, CheckCircle2, Circle, Trophy, Pencil, Bookmark } from 'lucide-react';
import LogForm from '../components/LogForm';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em progresso',
  completed: 'Completo',
  dropped: 'Abandonado',
  wishlist: 'Lista de desejos',
  soon: 'Em breve',
  platinated: 'Platinado',
};

interface WatchedEpisode {
  id?: number;
  season_number: number;
  episode_number: number;
  episode_name?: string;
  watched: boolean;
  log_date?: string;
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

const TYPE_META: Record<string, { emoji: string; color: string; label: string }> = {
  movie: { emoji: '🎬', color: '#fbbf24', label: 'Filme' },
  series: { emoji: '📺', color: '#ef4444', label: 'Série' },
  game: { emoji: '🎮', color: '#60a5fa', label: 'Jogo' },
  book: { emoji: '📚', color: '#4ade80', label: 'Livro' },
};

const LogDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [seasons, setSeasons] = useState<TmdbSeason[]>([]);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, TmdbEpisode[]>>({});
  const [watchedMap, setWatchedMap] = useState<Record<string, WatchedEpisode>>({});

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [achLoading, setAchLoading] = useState(false);
  const [openAch, setOpenAch] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [wishlistLogId, setWishlistLogId] = useState<number | null>(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<LogReview[]>([]);

  const fetchLog = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/media/logs/${id}`);
      const data = response.data;
      setLog(data);

      if (data.media_item.media_type === 'series' && data.media_item.tmdb_id) {
        api.get(`/media/series/${data.media_item.tmdb_id}/seasons`).then(r => setSeasons(r.data || [])).catch(() => {});
        api.get(`/media/logs/${id}/episodes`).then(r => {
          const map: Record<string, WatchedEpisode> = {};
          (r.data || []).forEach((ep: WatchedEpisode) => { map[ep.season_number + '-' + ep.episode_number] = ep; });
          setWatchedMap(map);
        }).catch(() => {});
      }
      if (data.media_item.media_type === 'game' && data.media_item.igdb_id) {
        setAchLoading(true);
        api.get(`/media/games/${data.media_item.igdb_id}/achievements`).then(r => {
          const remote = r.data || [];
          api.get(`/media/logs/${id}/achievements`).then(r2 => {
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

      // Check if this media already has a wishlist entry
      api.get('/media/wishlist', { params: { user_id: data.user_id, media_type: data.media_item.media_type } })
        .then(r => {
          const match = (r.data || []).find((w: any) => w.media_item_id === data.media_item_id);
          setBookmarked(!!match);
          setWishlistLogId(match?.id ?? null);
        }).catch(() => {});

      // Fetch review history
      api.get(`/media/logs/${id}/reviews`)
        .then(r => setReviewHistory(r.data || []))
        .catch(() => {});
    } catch { navigate('/'); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const patch = async (updates: Record<string, unknown>) => {
    if (!id) return;
    const { data } = await api.patch('/media/logs/' + id, updates);
    setLog(data);
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

  const setRating = (v: number) => {
    if (!log) return;
    setLog({ ...log, rating: v });
    patch({ rating: v });
  };

  const handleEditSubmit = async (logDetails: any) => {
    if (!id) return;
    try {
      const { data } = await api.put(`/media/logs/${id}`, logDetails);
      setLog(data);
      setShowEditModal(false);
      // Refresh review history
      api.get(`/media/logs/${id}/reviews`).then(r => setReviewHistory(r.data || [])).catch(() => {});
      if (String(data.id) !== id) {
        navigate(`/log/${data.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to update log', error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try { await api.delete('/media/logs/' + id); navigate('/'); }
    catch { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const loadSeason = async (n: number) => {
    if (episodes[n]) { setOpenSeason(openSeason === n ? null : n); return; }
    if (!log?.media_item.tmdb_id) return;
    const { data } = await api.get('/media/series/' + log.media_item.tmdb_id + '/season/' + n + '/episodes');
    setEpisodes({ ...episodes, [n]: data });
    setOpenSeason(n);
  };

  const toggleEpisode = async (ep: TmdbEpisode) => {
    if (!id) return;
    const key = ep.season_number + '-' + ep.episode_number;
    const current = watchedMap[key];
    const newWatched = current ? !current.watched : true;
    try {
      const { data } = await api.post('/media/logs/' + id + '/episodes', {
        season_number: ep.season_number, episode_number: ep.episode_number,
        episode_name: ep.name, watched: newWatched, log_date: new Date().toISOString().split('T')[0],
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

  const toggleAllEpisodes = async (seasonEps: TmdbEpisode[], markWatched: boolean) => {
    if (!id) return;
    const newMap = { ...watchedMap };
    let watchedChange = 0;
    for (const ep of seasonEps) {
      const key = ep.season_number + '-' + ep.episode_number;
      const isCurrentlyWatched = !!newMap[key]?.watched;
      if (isCurrentlyWatched !== markWatched) {
         watchedChange += markWatched ? 1 : -1;
      }
      try {
        const { data } = await api.post('/media/logs/' + id + '/episodes', {
          season_number: ep.season_number, episode_number: ep.episode_number,
          episode_name: ep.name, watched: markWatched, log_date: new Date().toISOString().split('T')[0],
        });
        newMap[key] = data;
      } catch (err) {
        console.error('Failed to toggle episode:', err);
      }
    }
    setWatchedMap(newMap);
    if (log) {
      setLog({ ...log, watched_episodes: (log.watched_episodes || 0) + watchedChange });
    }
  };

  const toggleAch = async (a: AchievementItem) => {
    if (!id) return;
    const newUnlocked = !a.unlocked;
    const { data } = await api.post('/media/logs/' + id + '/achievements', {
      external_id: a.external_id, name: a.name, description: a.description || '',
      image_url: a.image_url || '', unlocked: newUnlocked,
    });
    setAchievements(achievements.map(x => x.external_id === a.external_id ? { ...x, unlocked: newUnlocked, id: data.id } : x));
  };

  const toggleAllAch = async (markUnlocked: boolean) => {
    if (!id) return;
    for (const a of achievements) {
      if (a.unlocked !== markUnlocked) {
        await api.post('/media/logs/' + id + '/achievements', {
          external_id: a.external_id, name: a.name, description: a.description || '',
          image_url: a.image_url || '', unlocked: markUnlocked,
        });
      }
    }
    setAchievements(achievements.map(x => ({ ...x, unlocked: markUnlocked })));
  };

  const renderStars = (rating: number | undefined, onChange?: (v: number) => void) => {
    const current = rating || 0;
    return Array.from({ length: 5 }, (_, i) => {
      const star = i + 1;
      const fillPercent = current >= star ? 100 : current >= star - 0.5 ? 50 : 0;
      return (
        <button key={star} type="button"
          onClick={onChange ? (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onChange((e.clientX - rect.left) < rect.width / 2 ? star - 0.5 : star);
          } : undefined}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
          style={{ background: 'none', border: 'none', padding: '0 0.125rem', lineHeight: 1, position: 'relative', fontSize: 'inherit' }}>
          <span style={{ color: 'var(--border)', fontSize: 'inherit' }}>&#9733;</span>
          {fillPercent > 0 && (
            <span style={{ position: 'absolute', left: 0, top: 0, width: fillPercent + '%', overflow: 'hidden', color: 'var(--mdf-yellow)', fontSize: 'inherit' }}>&#9733;</span>
          )}
        </button>
      );
    });
  };

  if (loading) return <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>;
  if (!log) return null;

  const md = log.media_item;
  const meta = TYPE_META[md.media_type] || TYPE_META.game;
  const watchedCount = log?.watched_episodes || 0;
  const totalEps = log?.total_episodes || 0;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-6 mx-auto" style={{ maxWidth: '900px' }}>
      <Link to="/" className="mdf-btn-ghost text-sm inline-flex items-center gap-2">
        <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
        Voltar
      </Link>

      <div className="flex gap-6 mdf-card p-0 overflow-hidden">
        <div className="flex-shrink-0" style={{ width: '200px' }}>
          {md.cover_image_url ? (
            <img src={md.cover_image_url} alt={md.title} className="w-full h-full object-cover" style={{ aspectRatio: '2/3' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: meta.color + '22', aspectRatio: '2/3' }}>
              <span className="text-5xl">{meta.emoji}</span>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col min-w-0">
          <div className="flex items-start gap-3 flex-wrap mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: meta.color + '22', color: meta.color }}>{meta.label}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
              background: log.status === 'completed' ? 'rgba(34,197,94,0.2)' : log.status === 'in_progress' ? 'rgba(59,130,246,0.2)' :
                log.status === 'dropped' ? 'rgba(239,68,68,0.2)' : log.status === 'platinated' ? 'rgba(250,204,21,0.2)' : 'rgba(168,85,247,0.2)',
            }}>{STATUS_LABELS[log.status] || log.status}</span>
            {log.is_relog && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>Rejogado</span>}
          </div>

          <h1 className="font-display text-3xl font-black tracking-tight mb-4">{md.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div style={{ fontSize: '1.75rem' }}>{renderStars(log.rating, setRating)}</div>
            {log.status === 'completed' && (
              <button onClick={handleBookmark} disabled={bookmarking}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
                style={{
                  borderColor: bookmarked ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)',
                  background: bookmarked ? 'rgba(168,85,247,0.15)' : 'transparent',
                  color: bookmarked ? '#a855f7' : 'rgba(255,255,255,0.6)',
                }}
                title={bookmarked ? 'Remover da lista de desejos' : 'Pretendo reassistir/rejogar'}
              >
                <Bookmark size={14} fill={bookmarked ? '#a855f7' : 'none'} />
              </button>
            )}
            <button onClick={() => setShowEditModal(true)}
              className="w-10 h-10 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-center transition-colors">
              <Pencil size={14} className="text-white/60" />
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-10 h-10 rounded-full border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-colors">
              <Trash2 size={14} className="text-white/60" />
            </button>
          </div>

          {md.release_date && <div className="text-sm text-white/60 mb-3">{new Date(md.release_date).getFullYear()}</div>}
          {md.synopsis && <p className="text-sm text-white/60 leading-relaxed mb-4 line-clamp-4">{md.synopsis}</p>}

          <div className="flex items-center gap-6 text-sm text-white/50">
            {(log.relog_count ?? 0) > 0 && <div><span className="text-white/30">Assistido:</span> <span className="text-white/70 font-bold">{(log.relog_count ?? 0) + 1}x</span></div>}
            {log.platform && <div><span className="text-white/30">Plataforma:</span> <span className="text-white/70">{log.platform}</span></div>}
            {log.media_item.media_type === 'book' && log.pages_read != null && log.pages_read > 0 && <div><span className="text-white/30">Páginas:</span> <span className="text-white/70">{log.pages_read}</span></div>}
            {log.hours_spent != null && log.hours_spent > 0 && <div><span className="text-white/30">Horas:</span> <span className="text-white/70">{log.hours_spent}h</span></div>}
            {log.log_date && <div><span className="text-white/30">Data:</span> <span className="text-white/70">{log.log_date.split('T')[0]}</span></div>}
          </div>
        </div>
      </div>

      {/* Steam Info */}
      {md.media_type === 'game' && md.steam_appid && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl font-bold">Dados da Steam</h3>
            {md.metacritic_score != null && (
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: md.metacritic_score >= 75 ? 'rgba(34,197,94,0.2)' : md.metacritic_score >= 50 ? 'rgba(250,204,21,0.2)' : 'rgba(239,68,68,0.2)', color: md.metacritic_score >= 75 ? '#22c55e' : md.metacritic_score >= 50 ? '#fbbf24' : '#ef4444' }}>
                Metacritic {md.metacritic_score}
              </span>
            )}
            {md.steam_price && (
              <span className="text-sm text-[var(--mdf-green)] font-bold">{md.steam_price}</span>
            )}
          </div>

          <div className="mdf-card p-4 space-y-3">
            {md.steam_genres && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Generos</div>
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
            {md.short_description && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Descricao</div>
                <p className="text-sm text-white/60 leading-relaxed" dangerouslySetInnerHTML={{ __html: md.short_description }} />
              </div>
            )}
          </div>

          {(() => {
            try {
              const shots = md.screenshots ? JSON.parse(md.screenshots) : [];
              if (shots.length === 0) return null;
              return (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Screenshots</div>
                  <div className="grid grid-cols-3 gap-2">
                    {shots.slice(0, 6).map((src: string, i: number) => (
                      <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="rounded-lg overflow-hidden block hover:opacity-80 transition-opacity">
                        <img src={src} alt="" className="w-full h-auto object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}

      {/* Movie / Series Info */}
      {(md.media_type === 'movie' || md.media_type === 'series') && (md.genres || md.runtime != null || md.vote_average != null || md.director) && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl font-bold">{md.media_type === 'movie' ? 'Dados do Filme' : 'Dados da Serie'}</h3>
            {md.vote_average != null && md.vote_average > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}>
                TMDb {md.vote_average.toFixed(1)}
              </span>
            )}
            {md.runtime != null && md.runtime > 0 && (
              <span className="text-sm text-white/50">{md.runtime} min</span>
            )}
          </div>
          <div className="mdf-card p-4 space-y-3">
            {md.director && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">{md.media_type === 'movie' ? 'Diretor' : 'Criador'}</div>
                <div className="text-sm text-white/70">{md.director}</div>
              </div>
            )}
            {md.runtime && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Duração</div>
                <div className="text-sm text-white/70">{md.runtime} min</div>
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
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Generos</div>
                <div className="flex flex-wrap gap-1.5">
                  {md.genres.split(', ').map(g => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{g}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {md.trailer_url && (
            <a href={md.trailer_url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--mdf-green)] hover:underline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Assistir trailer
            </a>
          )}
        </div>
      )}

      {/* Book Info */}
      {md.media_type === 'book' && (md.publisher || md.page_count != null || md.book_categories || md.book_language) && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl font-bold">Dados do Livro</h3>
            {md.book_rating != null && md.book_rating > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}>
                Google Books {md.book_rating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="mdf-card p-4 space-y-3">
            {md.publisher && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Editora</div>
                <div className="text-sm text-white/70">{md.publisher}</div>
              </div>
            )}
            <div className="flex gap-6 text-sm">
              {md.page_count != null && md.page_count > 0 && (
                <div><span className="text-white/30">Paginas:</span> <span className="text-white/70">{md.page_count}</span></div>
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

      {/* Episodes */}
      {md.media_type === 'series' && seasons.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold">Temporadas</h3>
            {totalEps > 0 && <div className="text-xs text-white/40 font-mono">{watchedCount}/{totalEps} episodios</div>}
          </div>
          <div className="space-y-2">
            {seasons.map(s => {
              const sWatched = Object.values(watchedMap).filter(e => e.season_number === s.season_number && e.watched).length;
              const total = s.episode_count || 0;
              const pct = total > 0 ? (sWatched / total) * 100 : 0;
              const eps = episodes[s.season_number] || [];
              return (
                <div key={s.season_number} className="mdf-card overflow-hidden">
                  <button onClick={() => loadSeason(s.season_number)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">{s.episode_count} episodios</div>
                    </div>
                    <div className="flex-1 max-w-[200px]">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--mdf-green)] transition-all" style={{ width: pct + '%' }} />
                      </div>
                      <div className="text-[10px] text-white/40 text-right mt-1 font-mono">{sWatched}/{total}</div>
                    </div>
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
                        toggleAllEpisodes(seasonEps, sWatched < total);
                      }}
                      className="flex-shrink-0"
                    >
                      {sWatched === total
                        ? <CheckCircle2 size={20} style={{ color: 'var(--mdf-green)' }} />
                        : <Circle size={20} className="text-white/30 hover:text-white/50 transition-colors" />}
                    </button>
                    <ChevronDown size={16} className={`text-white/40 transition-transform ${openSeason === s.season_number ? 'rotate-180' : ''}`} />
                  </button>
                  {openSeason === s.season_number && eps.length > 0 && (
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {eps.map(ep => {
                        const watched = watchedMap[ep.season_number + '-' + ep.episode_number]?.watched || false;
                        return (
                          <div key={ep.episode_number} className="flex items-center gap-3 px-4 py-3">
                            <button onClick={() => toggleEpisode(ep)} className="flex-shrink-0">
                              {watched ? <CheckCircle2 size={20} style={{ color: 'var(--mdf-green)' }} /> : <Circle size={20} className="text-white/30" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">
                                <span className="text-white/40 font-mono mr-2 text-xs">S{String(ep.season_number).padStart(2, '0')}E{String(ep.episode_number).padStart(2, '0')}</span>
                                <span className="font-semibold">{ep.name}</span>
                              </div>
                              {ep.air_date && <div className="text-xs text-white/40">{ep.air_date}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviewHistory.length > 0 && (
        <div>
          <h3 className="font-display text-xl font-bold mb-3">
            Reviews {reviewHistory.length > 1 && <span className="text-white/40 text-sm font-normal">({reviewHistory.length})</span>}
          </h3>
          <div className="space-y-2">
            {reviewHistory.map((r) => (
              <div key={r.id} className="mdf-card p-4 rounded-xl flex gap-3" style={{ borderLeft: '3px solid rgba(255,255,255,0.08)' }}>
                <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                  {r.rating != null && r.rating > 0 && (
                    <div className="flex items-center gap-0.5" style={{ color: 'var(--mdf-yellow)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--mdf-yellow)" stroke="var(--mdf-yellow)" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span className="text-sm font-bold">{r.rating}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-white/30">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {r.platform && <div className="text-xs text-white/40 mb-1">{r.platform}</div>}
                  {r.review_text && <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{r.review_text}</p>}
                  {!r.review_text && <p className="text-xs text-white/30 italic">Sem review</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {md.media_type === 'game' && (
        <div>
          <button onClick={() => setOpenAch(!openAch)} className="w-full flex items-center justify-between mb-3 hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors">
            <div className="flex items-center gap-2">
              <Trophy size={18} style={{ color: 'var(--mdf-yellow)' }} />
              <h3 className="font-display text-xl font-bold">Conquistas</h3>
              {achievements.length > 0 && (
                <span className="text-sm text-white/60 font-mono">{unlockedCount}/{achievements.length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {achievements.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleAllAch(unlockedCount < achievements.length); }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                >
                  {unlockedCount < achievements.length ? 'Marcar todas' : 'Desmarcar todas'}
                </button>
              )}
              <ChevronDown size={16} className={`text-white/40 transition-transform ${openAch ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {achLoading && <div className="text-white/50 text-sm">Carregando conquistas...</div>}
          {!achLoading && achievements.length === 0 && (
            <div className="mdf-card p-6 text-center text-white/50 text-sm">
              {md.igdb_id ? 'Sem conquistas encontradas para este jogo no Steam.' : 'Busque por um jogo para importar conquistas.'}
            </div>
          )}
          {openAch && achievements.length > 0 && (
            <>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-[var(--mdf-yellow)] transition-all" style={{ width: (achievements.length ? (unlockedCount / achievements.length) * 100 : 0) + '%' }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {achievements.map(a => (
                  <button key={a.external_id} onClick={() => toggleAch(a)}
                    className={`mdf-card p-3 flex items-center gap-3 text-left transition-colors ${a.unlocked ? 'border border-[var(--mdf-green)]/30 bg-[var(--mdf-green)]/5' : 'hover:bg-white/5'}`}>
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

      {/* Edit Modal */}
      {showEditModal && (
        <LogForm
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
          initialData={log}
          mediaItem={log.media_item}
          isEditing={true}
        />
      )}

      {/* Delete modal */}
      {showDeleteConfirm && createPortal(
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Excluir log</h3>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir o log de <strong>{md.title}</strong>?</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Esta acao nao pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteConfirm(false)} className="mdf-btn-ghost text-sm" disabled={deleting}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="text-sm py-2 px-4 rounded-xl font-bold" style={{ background: '#ef4444', color: '#fff' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LogDetailPage;
