import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, LogStatus } from '../types';
import { LogStatusValues } from '../types';
import { ChevronDown, Heart, Trash2, CheckCircle2, Circle, Trophy, Star } from 'lucide-react';

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
}

const LogDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const [review, setReview] = useState('');
  const [hours, setHours] = useState('');
  const [platform, setPlatform] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const [seasons, setSeasons] = useState<TmdbSeason[]>([]);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, TmdbEpisode[]>>({});
  const [watchedMap, setWatchedMap] = useState<Record<string, WatchedEpisode>>({});

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [achLoading, setAchLoading] = useState(false);

  const fetchLog = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/media/logs/${id}`);
      const data = response.data;
      setLog(data);
      setReview(data.review || '');
      setHours(data.hours_spent != null ? String(data.hours_spent) : '');
      setPlatform(data.platform || '');

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
              external_id: String((a.id as number) || (a.name as string)),
              name: a.name as string,
              description: (a.description as string) || '',
              image_url: (a.url as string) || '',
              unlocked: savedMap.get(String((a.id as number) || (a.name as string)))?.unlocked || false,
            })));
          });
        }).catch(() => {}).finally(() => setAchLoading(false));
      }
    } catch { navigate('/'); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  useEffect(() => {
    if (!log) return;
    setHasChanges(
      review !== (log.review || '') ||
      hours !== (log.hours_spent != null ? String(log.hours_spent) : '') ||
      platform !== (log.platform || '')
    );
  }, [review, hours, platform, log]);

  const patch = async (updates: Record<string, unknown>) => {
    if (!id) return;
    const { data } = await api.patch('/media/logs/' + id, updates);
    setLog(data);
  };

  const toggleFav = () => {
    if (!log) return;
    const v = !log.is_favorite;
    setLog({ ...log, is_favorite: v });
    patch({ is_favorite: v });
  };

  const setRating = (v: number) => {
    if (!log) return;
    setLog({ ...log, rating: v });
    patch({ rating: v });
  };

  const setStatus = (s: LogStatus) => {
    if (!log) return;
    setLog({ ...log, status: s });
    patch({ status: s });
    setShowStatusMenu(false);
  };

  const saveInline = () => {
    if (!id) return;
    const h = hours === '' ? null : parseFloat(hours.replace(',', '.'));
    api.patch('/media/logs/' + id, { review, hours_spent: h, platform }).then(r => {
      setLog(r.data);
      setHasChanges(false);
    });
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
    const { data } = await api.post('/media/logs/' + id + '/episodes', {
      season_number: ep.season_number, episode_number: ep.episode_number,
      episode_name: ep.name, watched: newWatched, log_date: new Date().toISOString().split('T')[0],
    });
    setWatchedMap({ ...watchedMap, [key]: data });
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
  const typeLabels: Record<string, string> = { movie: 'Filme', series: 'Serie', game: 'Jogo', book: 'Livro' };
  const watchedCount = Object.values(watchedMap).filter(e => e.watched).length;
  const totalEps = Object.values(episodes).reduce((s, arr) => s + arr.length, 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-6">
      <Link to="/" className="mdf-btn-ghost text-sm inline-flex items-center gap-2">
        <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
        Voltar
      </Link>

      <div className="flex gap-6 mdf-card p-0 overflow-hidden" style={{ maxWidth: '900px' }}>
        <div className="flex-shrink-0" style={{ width: '200px' }}>
          {md.cover_image_url ? (
            <img src={md.cover_image_url} alt={md.title} className="w-full h-full object-cover" style={{ aspectRatio: '2/3' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--mdf-surface-2)]" style={{ aspectRatio: '2/3' }}>
              <Star size={40} className="text-white/30" />
            </div>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col min-w-0">
          <div className="flex items-start gap-3 flex-wrap mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/70">{typeLabels[md.media_type]}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
              background: log.status === 'completed' ? 'rgba(34,197,94,0.2)' : log.status === 'in_progress' ? 'rgba(59,130,246,0.2)' :
                log.status === 'dropped' ? 'rgba(239,68,68,0.2)' : log.status === 'platinated' ? 'rgba(250,204,21,0.2)' : 'rgba(168,85,247,0.2)',
            }}>{STATUS_LABELS[log.status] || log.status}</span>
            {log.is_relog && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>Rejogado</span>}
          </div>

          <h1 className="font-display text-3xl font-black tracking-tight mb-4">{md.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div style={{ fontSize: '1.75rem' }}>{renderStars(log.rating, setRating)}</div>
            <button onClick={toggleFav}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${log.is_favorite ? 'border-[var(--mdf-pink)] bg-[var(--mdf-pink)]/10' : 'border-white/10 hover:border-white/20'}`}>
              <Heart size={16} className={log.is_favorite ? 'text-[var(--mdf-pink)]' : 'text-white/70'} fill={log.is_favorite ? 'var(--mdf-pink)' : 'none'} />
            </button>
            <div className="relative">
              <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="mdf-btn-ghost text-sm flex items-center gap-2">
                {STATUS_LABELS[log.status] || 'Definir status'} <ChevronDown size={14} />
              </button>
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 w-52 mdf-card overflow-hidden z-50">
                  {LogStatusValues.map(s => (
                    <button key={s} onClick={() => setStatus(s)}
                      className="block w-full px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="ml-auto w-10 h-10 rounded-full border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-colors">
              <Trash2 size={14} className="text-white/60" />
            </button>
          </div>

          {md.release_date && <div className="text-sm text-white/60 mb-3">{new Date(md.release_date).getFullYear()}</div>}
          {md.synopsis && <p className="text-sm text-white/60 leading-relaxed mb-4">{md.synopsis}</p>}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Plataforma</div>
              <input value={platform} onChange={e => { setPlatform(e.target.value); setHasChanges(true); }}
                placeholder="PS5, Steam..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--mdf-surface-2)] border border-white/10 text-white outline-none focus:border-[var(--mdf-green)]" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Horas</div>
              <input type="text" value={hours} onChange={e => { setHours(e.target.value); setHasChanges(true); }}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--mdf-surface-2)] border border-white/10 text-white outline-none focus:border-[var(--mdf-green)]" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Data</div>
              <div className="px-3 py-2 text-sm text-white/60 font-mono">{log.log_date?.split('T')[0]}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Review</div>
            <textarea value={review} rows={3} onChange={e => { setReview(e.target.value); setHasChanges(true); }}
              placeholder="Escreva sua opiniao..."
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--mdf-surface-2)] border border-white/10 text-white outline-none focus:border-[var(--mdf-green)] resize-none" />
          </div>

          {hasChanges && (
            <button onClick={saveInline} className="mdf-btn-primary text-sm self-start">Salvar alteracoes</button>
          )}
        </div>
      </div>

      {/* Episodes */}
      {md.media_type === 'series' && seasons.length > 0 && (
        <div style={{ maxWidth: '900px' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold">Temporadas</h3>
            {totalEps > 0 && <div className="text-xs text-white/40 font-mono">{watchedCount}/{totalEps} episodios</div>}
          </div>
          <div className="space-y-2">
            {seasons.map(s => {
              const eps = episodes[s.season_number] || [];
              const sWatched = eps.filter(e => watchedMap[e.season_number + '-' + e.episode_number]?.watched).length;
              const pct = eps.length ? (sWatched / eps.length) * 100 : 0;
              return (
                <div key={s.season_number} className="mdf-card overflow-hidden">
                  <button onClick={() => loadSeason(s.season_number)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">{s.episode_count} episodios</div>
                    </div>
                    {eps.length > 0 && (
                      <div className="flex-1 max-w-[200px]">
                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--mdf-green)] transition-all" style={{ width: pct + '%' }} />
                        </div>
                        <div className="text-[10px] text-white/40 text-right mt-1 font-mono">{sWatched}/{eps.length}</div>
                      </div>
                    )}
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

      {/* Achievements */}
      {md.media_type === 'game' && (
        <div style={{ maxWidth: '900px' }}>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display text-xl font-bold flex items-center gap-2">
              <Trophy size={18} style={{ color: 'var(--mdf-yellow)' }} />
              Conquistas
            </h3>
            {achievements.length > 0 && (
              <div className="text-sm text-white/60 font-mono">{unlockedCount}/{achievements.length}</div>
            )}
          </div>
          {achLoading && <div className="text-white/50 text-sm">Carregando conquistas...</div>}
          {!achLoading && achievements.length === 0 && (
            <div className="mdf-card p-6 text-center text-white/50 text-sm">
              {md.igdb_id ? 'Sem conquistas encontradas.' : 'Busque por um jogo com IGDB para importar conquistas.'}
            </div>
          )}
          {achievements.length > 0 && (
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
                    </div>
                    {a.unlocked && <CheckCircle2 size={18} style={{ color: 'var(--mdf-green)' }} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete modal */}
      {showDeleteConfirm && (
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
        </div>
      )}
    </div>
  );
};

export default LogDetailPage;
