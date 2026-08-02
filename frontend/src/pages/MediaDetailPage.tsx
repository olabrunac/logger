import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, BookOpen, Star } from 'lucide-react';
import api, { getMediaByApi } from '../services/api';
import type { MediaItem } from '../types/media';
import { getLogUrl, imageUrl } from '../utils';
import { TYPE_META, getStars } from '../constants/designSystem';

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string;
}

interface Episode {
  episode_number: number;
  season_number: number;
  name: string;
  air_date?: string;
  still_path?: string;
}

interface AchievementItem {
  external_id: string;
  name: string;
  description?: string;
  image_url?: string;
  unlock_percentage?: number | null;
}

interface MediaDetail extends MediaItem {
  id: number;
  has_log?: boolean;
  log_id?: number | null;
  total_episodes?: number | null;
  user_log?: UserLog | null;
  community_reviews?: CommunityReview[];
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

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em progresso',
  completed: 'Completo',
  dropped: 'Abandonado',
  wishlist: 'Lista de desejos',
  soon: 'Em breve',
  platinated: 'Platinado',
  library: 'Biblioteca',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'rgba(34,197,94,0.2)',
  in_progress: 'rgba(59,130,246,0.2)',
  dropped: 'rgba(239,68,68,0.2)',
  wishlist: 'rgba(168,85,247,0.2)',
  soon: 'rgba(168,85,247,0.2)',
  platinated: 'rgba(250,204,21,0.2)',
  library: 'rgba(99,102,241,0.2)',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  dropped: '#ef4444',
  wishlist: '#a855f7',
  soon: '#a855f7',
  platinated: '#fbbf24',
  library: '#818cf8',
};

const MediaDetailPage = () => {
  const { mediaType, apiId } = useParams<{ mediaType: string; apiId: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Record<number, Episode[]>>({});
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);

  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.id as number | undefined;
    } catch { return undefined; }
  })();

  const loadSeason = useCallback(async (n: number) => {
    setOpenSeason(prev => (prev === n ? null : n));
    if (!media?.tmdb_id) return;
    if (episodes[n]) return;
    try {
      const { data } = await api.get(`/media/series/${media.tmdb_id}/season/${n}/episodes`);
      setEpisodes(prev => ({ ...prev, [n]: data || [] }));
    } catch { setEpisodes(prev => ({ ...prev, [n]: [] })); }
  }, [media?.tmdb_id, episodes]);

  useEffect(() => {
    if (!mediaType || !apiId) return;
    setLoading(true);
    getMediaByApi(mediaType, apiId, currentUserId)
      .then(res => {
        setMedia(res.data);
        return res.data;
      })
      .then(async (md) => {
        if (md?.media_type === 'series' && md.tmdb_id) {
          try {
            const { data } = await api.get(`/media/series/${md.tmdb_id}/seasons`);
            setSeasons(data || []);
          } catch { setSeasons([]); }
        }
      })
      .catch(() => { setMedia(null); })
      .finally(() => setLoading(false));
  }, [mediaType, apiId, currentUserId]);

  useEffect(() => {
    if (!media) return;
    if (media.media_type === 'game' && media.igdb_id) {
      api.get(`/media/games/${media.igdb_id}/achievements`)
        .then(r => setAchievements(r.data || []))
        .catch(() => setAchievements([]));
    }
  }, [media]);

  if (loading) return <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>;
  if (!media) return <div className="mdf-card p-8 text-center text-white/50">Mídia não encontrada.</div>;

  const md = media;
  const meta = TYPE_META[md.media_type] || TYPE_META.game;
  const totalEps = seasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || md.total_episodes || 0;

  const goToLog = () => {
    if (md.has_log && md.log_id) {
      navigate(getLogUrl(md));
    } else {
      navigate('/new-log', { state: { media: md } });
    }
  };

  return (
    <div className="space-y-6 mx-auto" style={{ maxWidth: '900px' }}>
      <Link to="/" className="mdf-btn-ghost text-sm inline-flex items-center gap-2">
        <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
        Voltar
      </Link>

      <div className="flex gap-6 mdf-card p-0 overflow-hidden">
        <div className="flex-shrink-0" style={{ width: '200px' }}>
          {md.cover_image_url ? (
            <img src={imageUrl(md.cover_image_url)} alt={md.title} className="w-full h-full object-cover" style={{ aspectRatio: '2/3' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: meta.color + '22', aspectRatio: '2/3' }}>
              <span className="text-5xl">{meta.emoji}</span>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col min-w-0">
          <div className="flex items-start gap-3 flex-wrap mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: meta.color + '22', color: meta.color }}>{meta.label}</span>
            {md.vote_average != null && md.vote_average > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1" style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}>
                <Star size={12} fill="#fbbf24" /> {md.vote_average.toFixed(1)}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-black tracking-tight mb-4">{md.title}</h1>

          <div className="flex items-center gap-4 text-sm text-white/50 mb-4 flex-wrap">
            {md.release_date && <div>Lançado em {md.release_date}</div>}
            {md.runtime != null && md.runtime > 0 && <div>{md.runtime} min</div>}
            {md.media_type === 'series' && totalEps > 0 && <div>{seasons.length} temporadas · {totalEps} episódios</div>}
            {md.media_type === 'game' && achievements.length > 0 && <div>{achievements.length} conquistas</div>}
            {md.media_type === 'book' && md.page_count != null && md.page_count > 0 && <div>{md.page_count} páginas</div>}
          </div>

          {md.synopsis && <p className="text-sm text-white/60 leading-relaxed mb-4">{md.synopsis}</p>}

          <div className="mt-auto flex items-center gap-3 pt-4">
            <button
              onClick={goToLog}
              className="mdf-btn-primary text-sm inline-flex items-center gap-2"
            >
              {md.has_log ? 'Meu log' : 'Adicionar ao diário'}
              {md.has_log ? <ChevronRight size={16} /> : <Plus size={16} />}
            </button>
            {md.has_log && (
              <button
                onClick={() => navigate('/new-log', { state: { media: md } })}
                className="mdf-btn-ghost text-sm"
              >
                Editar log
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meu log */}
      {md.user_log && (
        <div className="mdf-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-lg font-bold">Meu log</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: STATUS_COLORS[md.user_log.status] || 'rgba(255,255,255,0.1)', color: STATUS_TEXT_COLORS[md.user_log.status] || '#fff' }}>
              {STATUS_LABELS[md.user_log.status] || md.user_log.status}
            </span>
            {md.user_log.is_favorite && <span className="text-xs text-red-400">♥</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50 mb-3">
            {md.user_log.rating != null && md.user_log.rating > 0 && (
              <div className="flex items-center gap-1" style={{ color: '#fbbf24' }}>
                {getStars(md.user_log.rating).map((s, i) => (
                  <Star key={i} size={14} fill={s === 'empty' ? 'none' : '#fbbf24'} className={s === 'empty' ? 'text-white/20' : ''} />
                ))}
                <span className="ml-1 text-white/60 font-mono">{md.user_log.rating.toFixed(1)}</span>
              </div>
            )}
            {md.user_log.log_date && <div>Quando: <span className="text-white/70">{md.user_log.log_date.split('T')[0]}</span></div>}
            {md.user_log.platform && <div>Plataforma: <span className="text-white/70">{md.user_log.platform}</span></div>}
            {md.user_log.hours_spent != null && md.user_log.hours_spent > 0 && <div>Horas: <span className="text-white/70">{md.user_log.hours_spent}h</span></div>}
            {md.media_type === 'book' && <div>Páginas: <span className="text-white/70">{md.user_log.pages_read ?? '-'}</span></div>}
          </div>
          {md.user_log.review && (
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{md.user_log.review}</p>
          )}
        </div>
      )}

      {/* Reviews da comunidade */}
      {md.community_reviews && md.community_reviews.length > 0 && (
        <div>
          <h3 className="font-display text-xl font-bold mb-3">Reviews da comunidade</h3>
          <div className="space-y-2">
            {md.community_reviews.map(r => (
              <div key={r.id} className="mdf-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Link to={`/profile/${r.username}`} className="flex items-center gap-2 min-w-0">
                    {r.avatar_url ? (
                      <img src={imageUrl(r.avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: r.accent_color || 'var(--accent)', color: '#000' }}>
                        {(r.display_name || r.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-white truncate">{r.display_name || r.username}</span>
                  </Link>
                  {r.rating != null && r.rating > 0 && (
                    <span className="flex items-center gap-0.5" style={{ color: '#fbbf24' }}>
                      {getStars(r.rating).map((s, i) => (
                        <Star key={i} size={12} fill={s === 'empty' ? 'none' : '#fbbf24'} className={s === 'empty' ? 'text-white/20' : ''} />
                      ))}
                    </span>
                  )}
                  {r.log_date && <span className="text-xs text-white/40 ml-auto flex-shrink-0">{r.log_date.split('T')[0]}</span>}
                </div>
                {r.review && <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{r.review}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steam Info */}
      {md.media_type === 'game' && md.steam_appid && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl font-bold">Dados da Steam</h3>
            {md.metacritic_score != null && (
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: md.metacritic_score >= 75 ? 'var(--accent-bg)' : md.metacritic_score >= 50 ? 'rgba(250,204,21,0.2)' : 'rgba(239,68,68,0.2)', color: md.metacritic_score >= 75 ? 'var(--accent)' : md.metacritic_score >= 50 ? '#fbbf24' : '#ef4444' }}>
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
            {md.short_description && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Descrição</div>
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
      {(md.media_type === 'movie' || md.media_type === 'series') && (md.genres || md.runtime != null || md.director) && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl font-bold">{md.media_type === 'movie' ? 'Dados do Filme' : 'Dados da Série'}</h3>
          </div>
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

      {/* Episodes */}
      {md.media_type === 'series' && seasons.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold">Temporadas</h3>
            {totalEps > 0 && <div className="text-xs text-white/40 font-mono">{totalEps} episódios</div>}
          </div>
          <div className="space-y-2">
            {seasons.map(s => {
              const eps = episodes[s.season_number] || [];
              const today = new Date();
              const released = eps.filter(e => !e.air_date || new Date(e.air_date) <= today).length;
              return (
                <div key={s.season_number} className="mdf-card overflow-hidden">
                  <button onClick={() => loadSeason(s.season_number)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">{s.episode_count} episódios</div>
                    </div>
                    {eps.length > 0 && released > 0 && (
                      <div className="text-[10px] text-white/40 font-mono">{released}/{eps.length} lançados</div>
                    )}
                    <ChevronDown size={16} className={`text-white/40 transition-transform ${openSeason === s.season_number ? 'rotate-180' : ''}`} />
                  </button>
                  {openSeason === s.season_number && eps.length > 0 && (
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {eps.map(e => (
                        <div key={e.episode_number} className="flex items-center gap-3 px-4 py-2.5">
                          {e.still_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w200${e.still_path}`}
                              alt=""
                              className="w-20 h-12 object-cover rounded flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white/80 truncate">{e.episode_number}. {e.name}</div>
                            {e.air_date && <div className="text-xs text-white/40">{e.air_date}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements */}
      {md.media_type === 'game' && achievements.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl font-bold inline-flex items-center gap-2">
              <BookOpen size={18} /> Conquistas
            </h3>
          </div>
          <div className="mdf-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  {a.image_url && <img src={a.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" loading="lazy" />}
                  <div className="min-w-0">
                    <div className="text-xs text-white/80 truncate">{a.name}</div>
                    {a.unlock_percentage != null && (
                      <div className="text-[10px] text-white/40">{a.unlock_percentage.toFixed(1)}% desbloqueiam</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDetailPage;
