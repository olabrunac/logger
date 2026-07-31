import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getUserCustomLists, getUserFavorites } from '../services/api';
import type { LogEntry, LogReview, User, CustomList, TopListItem, MediaItem } from '../types';
import ProfileHero from '../components/ProfileHero';
import YgpCard from '../components/sections/YgpCard';
import SectionHeader from '../components/sections/SectionHeader';
import LayoutEditorModal from '../components/sections/LayoutEditorModal';
import { TYPE_META, getStars } from '../constants/designSystem';
import { getLogUrl } from '../utils';
import { Heart, Clock, Star, Target, CheckCircle, BookOpen, X, Layers, Menu, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

interface MediaTypeProfilePageProps {
  currentUser: User;
  mediaType?: string;
  profileUser?: User | null;
  logs?: LogEntry[];
  customLists?: CustomList[];
  topListItems?: TopListItem[];
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

const STATUS_SECTIONS = [
  { id: 'in_progress', label: 'Em Progresso', status: 'in_progress', emptyMsg: 'Nenhuma mídia em progresso.' },
  { id: 'completed', label: 'Finalizados', status: 'completed', emptyMsg: 'Nenhuma mídia finalizada.' },
  { id: 'wishlist', label: 'Na Lista de Desejos', status: 'wishlist', emptyMsg: 'Nenhuma mídia na lista de desejos.' },
  { id: 'library', label: 'Na Biblioteca', status: 'library', emptyMsg: 'Nenhuma mídia na biblioteca.' },
  { id: 'dropped', label: 'Abandonados', status: 'dropped', emptyMsg: 'Nenhuma mídia abandonada.' },
];

const MediaTypeProfilePage = ({ currentUser, mediaType: propMediaType, profileUser: propProfileUser, logs: propLogs, customLists: propCustomLists, topListItems: propTopListItems }: MediaTypeProfilePageProps) => {
  const { username, mediaType: urlMediaType } = useParams<{ username: string; mediaType: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(propProfileUser ?? null);
  const [logs, setLogs] = useState<LogEntry[]>(propLogs ?? []);
  const [reviewMap, setReviewMap] = useState<Map<number, LogReview[]>>(new Map());
  const [loading, setLoading] = useState(!propProfileUser || !propLogs);
  const [error, setError] = useState<string | null>(null);
  const [showExpanded, setShowExpanded] = useState<Record<string, boolean>>({});
  const [customLists, setCustomLists] = useState<CustomList[]>(propCustomLists ?? []);
  const [topListItems, setTopListItems] = useState<TopListItem[]>(propTopListItems ?? []);

  const rawMediaType = propMediaType || urlMediaType || '';
  const mediaType = MEDIA_TYPE_MAP[rawMediaType] || 'movie';
  const meta = PAGE_META[mediaType] || PAGE_META.movie;
  const displayUsername = username || currentUser.username;
  const isOwnProfile = displayUsername === currentUser.username;
  const hasInitialData = !!(propProfileUser && propLogs);

  useEffect(() => {
    if (hasInitialData) {
      const reviewLogs = (propLogs || []).filter((l: LogEntry) => l.review && l.review.trim().length > 0);
      if (reviewLogs.length > 0) {
        api.post('/media/logs/reviews-batch', reviewLogs.map((l: LogEntry) => l.id)).then(r => {
          const map = new Map<number, LogReview[]>();
          Object.entries(r.data).forEach(([logId, reviews]) => {
            if ((reviews as LogReview[]).length > 0) map.set(Number(logId), reviews as LogReview[]);
          });
          setReviewMap(map);
        }).catch(() => {});
      }
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        let targetUser: User;
        if (isOwnProfile) {
          targetUser = currentUser;
        } else {
          const userRes = await api.get('/login/by-username/' + encodeURIComponent(displayUsername));
          targetUser = userRes.data;
        }
        setProfileUser(targetUser);

        const [logsRes, wishlistRes, customListsRes, topListRes] = await Promise.all([
          api.get('/media/logs', { params: { user_id: targetUser.id, limit: 500 } }),
          api.get('/media/wishlist', { params: { user_id: targetUser.id } }),
          getUserCustomLists(targetUser.id),
          api.get(`/media/users/${targetUser.id}/top-list`),
        ]);
        const allLogs = [...(logsRes.data || []), ...(wishlistRes.data || [])];
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
    })();
  }, [username, rawMediaType]);

  const filteredLogs = useMemo(() => logs.filter(l => l.media_item.media_type === mediaType), [logs, mediaType]);
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
  const [editingLayout, setEditingLayout] = useState(false);

  const [editingTop5, setEditingTop5] = useState(false);
  const [top5Favorites, setTop5Favorites] = useState<MediaItem[]>([]);
  const [top5Draft, setTop5Draft] = useState<TopListItem[]>([]);
  const [loadingTop5Fav, setLoadingTop5Fav] = useState(false);

  const loadTop5Favorites = async () => {
    setLoadingTop5Fav(true);
    try {
      const res = await getUserFavorites(profileUser!.id, mediaType);
      setTop5Favorites(res.data || []);
    } catch { /* ignore */ }
    setLoadingTop5Fav(false);
  };

  const startEditTop5 = () => {
    setEditingTop5(true);
    setTop5Draft(currentTopItems.map((i, idx) => ({ ...i, position: idx + 1 })));
    loadTop5Favorites();
  };

  const cancelEditTop5 = () => {
    setEditingTop5(false);
    setTop5Draft([]);
  };

  const saveTop5 = async () => {
    try {
      const currentIds = currentTopItems.map(i => i.id).filter(Boolean);
      for (const id of currentIds) {
        await api.delete(`/media/users/${profileUser!.id}/top-list/${id}`);
      }
      for (const item of top5Draft) {
        await api.post(`/media/users/${profileUser!.id}/top-list`, { media_item_id: (item as any).media_item_id || item.media_item?.id, position: item.position });
      }
      const res = await api.get(`/media/users/${profileUser!.id}/top-list`);
      setTopListItems(res.data || []);
      setEditingTop5(false);
      setTop5Draft([]);
    } catch (err) {
      console.error('Failed to save top list', err);
      alert('Erro ao salvar Top 5');
    }
  };

  const addTop5Item = (mediaId: number) => {
    if (top5Draft.length >= 5) return alert('Máximo de 5 itens');
    if (top5Draft.some(i => (i as any).media_item_id === mediaId || i.media_item?.id === mediaId)) return alert('Item já está no Top 5');
    const media = top5Favorites.find(m => m.id === mediaId);
    setTop5Draft(prev => [...prev, { media_item_id: mediaId, position: prev.length + 1, media_item: media } as unknown as TopListItem]);
  };

  const removeTop5Item = (index: number) => {
    setTop5Draft(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 })));
  };

  const moveTop5Item = (fromIndex: number, toIndex: number) => {
    setTop5Draft(prev => {
      const items = [...prev];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items.map((item, i) => ({ ...item, position: i + 1 }));
    });
  };

  const sectionConfig = useMemo(() => {
    try {
      const raw = profileUser?.section_order;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const categoryName = mediaType === 'game' ? 'games' : mediaType === 'movie' ? 'movies' : mediaType === 'series' ? 'series' : 'books';
        const catConfig = parsed[categoryName];
        if (catConfig?.desktop) return catConfig.desktop as Array<{ id: string; visible: boolean }>;
        if (parsed.general?.desktop) return parsed.general.desktop as Array<{ id: string; visible: boolean }>;
        if (parsed.desktop) return parsed.desktop as Array<{ id: string; visible: boolean }>;
      }
      return null;
    } catch { return null; }
  }, [profileUser?.section_order, mediaType]);

  const CATEGORY_NAME: Record<string, string> = { movie: 'movies', series: 'series', book: 'books', game: 'games' };

  const MEDIA_SECTION_DEFS = [
    { id: 'top_5', label: 'Top 5' },
    { id: 'recent', label: 'Recentes' },
    { id: 'in_progress', label: 'Em Progresso' },
    { id: 'completed', label: 'Finalizados' },
    { id: 'wishlist', label: 'Lista de Desejos' },
    { id: 'library', label: 'Biblioteca' },
    { id: 'dropped', label: 'Abandonados' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'all_items', label: 'Todos' },
    { id: 'custom_lists', label: 'Listas Personalizadas' },
  ];

  const handleSaveLayout = async (newSections: { id: string; visible: boolean }[]) => {
    const raw = profileUser?.section_order;
    let parsed: Record<string, any> = {};
    try { if (raw) parsed = JSON.parse(raw); } catch {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
    const cat = CATEGORY_NAME[mediaType] || 'movies';
    parsed[cat] = { ...(parsed[cat] || {}), desktop: newSections };
    await api.put(`/users/${profileUser!.id}/profile`, { section_order: JSON.stringify(parsed) });
    setProfileUser(prev => prev ? { ...prev, section_order: JSON.stringify(parsed) } : prev);
    setEditingLayout(false);
  };

  interface EffectiveSection { id: string; visible: boolean; label: string; icon: React.ReactNode; }
  const effectiveSections = useMemo(() => {
    const defaultSections: EffectiveSection[] = [
      { id: 'top_5', visible: true, label: 'Top 5', icon: <Heart className="h-3.5 w-3.5" /> },
      { id: 'recent', visible: true, label: 'Recentes', icon: <Clock className="h-3.5 w-3.5" /> },
      { id: 'in_progress', visible: true, label: 'Em Progresso', icon: <Target className="h-3.5 w-3.5" /> },
      { id: 'completed', visible: true, label: 'Finalizados', icon: <CheckCircle className="h-3.5 w-3.5" /> },
      { id: 'wishlist', visible: true, label: 'Lista de Desejos', icon: <Clock className="h-3.5 w-3.5" /> },
      { id: 'library', visible: true, label: 'Biblioteca', icon: <BookOpen className="h-3.5 w-3.5" /> },
      { id: 'dropped', visible: true, label: 'Abandonados', icon: <X className="h-3.5 w-3.5" /> },
      { id: 'reviews', visible: true, label: 'Reviews', icon: <Star className="h-3.5 w-3.5" /> },
      { id: 'all_items', visible: true, label: 'Todos', icon: <Layers className="h-3.5 w-3.5" /> },
      { id: 'custom_lists', visible: true, label: 'Listas Personalizadas', icon: <Menu className="h-3.5 w-3.5" /> },
    ];

    if (!sectionConfig) return defaultSections;

    const configMap = new Map(sectionConfig.map(s => [s.id, s.visible]));
    const order = sectionConfig.map(s => s.id);

    const ordered = defaultSections
      .filter(s => order.includes(s.id))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    for (const d of defaultSections) {
      if (!order.includes(d.id)) ordered.push(d);
    }

    return ordered.map(s => ({
      ...s,
      visible: configMap.has(s.id) ? configMap.get(s.id)! : s.visible,
    }));
  }, [sectionConfig]);

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

  const renderTop5 = () => {
    const displayItems = editingTop5 ? top5Draft : currentTopItems;
    if (displayItems.length === 0 && !editingTop5) {
      return (
        <section>
          <SectionHeader title="Top 5" />
          <div className="mdf-card p-6 text-center text-white/30 text-sm">
            Nenhum item no Top 5.
            {isOwnProfile && (
              <button onClick={startEditTop5} className="block mx-auto mt-3 px-4 py-2 text-xs font-bold rounded transition-colors bg-white/10 text-white/80 hover:bg-white/20">
                Adicionar itens
              </button>
            )}
          </div>
        </section>
      );
    }
    return (
      <section>
        <SectionHeader title="Top 5">
          {isOwnProfile && !editingTop5 && (
            <button onClick={startEditTop5} className="px-3 py-1 text-xs font-bold rounded bg-white/10 text-white/80 hover:bg-white/20 transition-colors">
              Editar
            </button>
          )}
          {editingTop5 && (
            <div className="flex gap-2">
              <button onClick={saveTop5} className="px-3 py-1 text-xs font-bold rounded text-black transition-colors" style={{ background: 'var(--accent)' }}>
                Salvar
              </button>
              <button onClick={cancelEditTop5} className="px-3 py-1 text-xs font-bold rounded bg-white/10 text-white/80 hover:bg-white/20 transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </SectionHeader>

        <div className="hidden gap-2 lg:flex lg:items-end lg:justify-center">
          {displayItems.map((item, index) => {
            const media = item.media_item || top5Favorites.find(m => m.id === (item as any).media_item_id) as MediaItem | undefined;
            const isGoat = index === 0;
            return (
              <div key={item.id || index} className="min-w-0 relative" style={{ width: `calc((100% - 32px) / 5)`, maxWidth: `calc((100% - 32px) / 5)` }}>
                {editingTop5 && (
                  <div className="flex justify-center gap-1 mb-1">
                    {index > 0 && (
                      <button onClick={() => moveTop5Item(index, index - 1)} className="p-0.5 bg-black/60 rounded text-white/60 hover:text-white">
                        <ChevronUp size={12} />
                      </button>
                    )}
                    {index < displayItems.length - 1 && (
                      <button onClick={() => moveTop5Item(index, index + 1)} className="p-0.5 bg-black/60 rounded text-white/60 hover:text-white">
                        <ChevronDown size={12} />
                      </button>
                    )}
                    <button onClick={() => removeTop5Item(index)} className="p-0.5 bg-black/60 rounded text-white/60 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                <div className={`relative ${isGoat && !editingTop5 ? '' : ''}`}>
                  {isGoat && !editingTop5 && (
                    <div className="flex justify-center -mb-3 relative z-10">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
                        <path d="M12 16v4"/>
                      </svg>
                    </div>
                  )}
                  <div className={`group relative flex flex-col overflow-hidden rounded-lg transition-opacity hover:opacity-90 ${isGoat && !editingTop5 ? 'outline outline-2' : ''}`}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      aspectRatio: '3/4',
                      outlineColor: isGoat && !editingTop5 ? '#F59E0B' : 'transparent',
                      outlineOffset: 0,
                    }}>
                    {media?.cover_image_url ? (
                      <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs" style={{background: meta.color + '11'}}>{meta.emoji}</div>
                    )}
                    <div className="absolute left-1.5 top-1.5">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg" style={{ background: meta.color }}>
                        {meta.emoji}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-2.5">
                      <div className="flex h-5 items-center gap-0.5 rounded bg-black/50 px-1.5 text-[10px] font-bold text-white/80 tabular-nums backdrop-blur-sm">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-center font-medium truncate w-full mt-1.5 text-white/70">{media?.title || '...'}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 lg:hidden">
          {displayItems.map((item, index) => {
            const media = item.media_item || top5Favorites.find(m => m.id === (item as any).media_item_id) as MediaItem | undefined;
            return (
              <div key={item.id || index} className="flex flex-col items-center gap-1 w-20">
                {editingTop5 && (
                  <button onClick={() => removeTop5Item(index)} className="self-end p-0.5 bg-black/60 rounded text-white/60 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                )}
                <div className="group relative flex flex-col overflow-hidden rounded-lg transition-opacity hover:opacity-90 w-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', aspectRatio: '3/4' }}>
                  {media?.cover_image_url ? (
                    <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs" style={{background: meta.color + '11'}}>{meta.emoji}</div>
                  )}
                  <div className="absolute left-1 top-1 bg-black/70 text-white font-mono text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {index + 1}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-1.5">
                    <div className="flex h-4 items-center gap-0.5 rounded bg-black/50 px-1 text-[8px] font-bold text-white/80 tabular-nums">
                      #{index + 1}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-center font-medium truncate w-full text-white/60">{media?.title || '...'}</div>
              </div>
            );
          })}
        </div>

        {editingTop5 && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="text-sm font-semibold text-white/70 mb-3">Adicionar dos favoritos</div>
            {loadingTop5Fav ? (
              <div className="text-center text-white/50 py-4">Carregando favoritos...</div>
            ) : top5Favorites.length === 0 ? (
              <div className="text-center text-white/50 py-4">Nenhum favorito de {meta.label.toLowerCase()} ainda. Marque itens como favoritos nos logs para aparecerem aqui.</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {top5Favorites.map(m => {
                  const alreadyAdded = top5Draft.some(i => (i as any).media_item_id === m.id || i.media_item?.id === m.id);
                  return (
                    <button key={m.id}
                      onClick={() => !alreadyAdded && addTop5Item(m.id!)}
                      disabled={alreadyAdded}
                      className={`flex-shrink-0 w-24 rounded-lg overflow-hidden transition-all group ${alreadyAdded ? 'opacity-40 cursor-default' : 'hover:scale-105'}`}
                      style={{ border: '1px solid var(--border)' }}>
                      {m.cover_image_url ? (
                        <img src={m.cover_image_url} alt={m.title} className="w-full h-28 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center text-white/20 text-xs" style={{background: meta.color + '11'}}>{meta.emoji}</div>
                      )}
                      <div className="p-1">
                        <div className="text-[10px] font-medium truncate text-white/70">{m.title}</div>
                        {alreadyAdded ? (
                          <div className="text-[8px] text-white/30">Na lista</div>
                        ) : (
                          <div className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity" style={{color: 'var(--accent)'}}>+ Adicionar</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  const renderStatusSection = (statusId: string) => {
    const entry = STATUS_SECTIONS.find(s => s.id === statusId);
    if (!entry) return null;
    const { label, status, emptyMsg } = entry;
    const sectionLogs = filteredLogs.filter(l => l.status === status);
    const expanded = showExpanded[statusId];
    return (
      <section key={statusId}>
        <SectionHeader title={label} count={sectionLogs.length} />
        {sectionLogs.length === 0 ? (
          <div className="mdf-card p-6 text-center text-white/30 text-sm">{emptyMsg}</div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
            {(expanded ? sectionLogs : sectionLogs.slice(0, 12)).map(log => (
              <YgpCard key={log.id} log={log} accentColor={accentColor} />
            ))}
            {sectionLogs.length > 12 && (
              <button onClick={() => toggleExpand(statusId)} className="flex flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', aspectRatio: '3/4' }}>
                <span className="text-lg font-bold text-white/40">{expanded ? '−' : '+'}</span>
                <span className="text-[10px] text-white/30">{expanded ? 'Ver menos' : `${sectionLogs.length - 12} mais`}</span>
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  const renderRecent = () => (
    <section>
      <SectionHeader title="Recentes" count={filteredLogs.length} />
      {filteredLogs.length === 0 ? (
        <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma mídia registrada.</div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
          {(showExpanded.recent ? filteredLogs : filteredLogs.slice(0, 12)).map(log => (
            <YgpCard key={log.id} log={log} accentColor={accentColor} />
          ))}
          {filteredLogs.length > 12 && (
            <button onClick={() => toggleExpand('recent')} className="flex flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', aspectRatio: '3/4' }}>
              <span className="text-lg font-bold text-white/40">{showExpanded.recent ? '−' : '+'}</span>
              <span className="text-[10px] text-white/30">{showExpanded.recent ? 'Recolher' : `${filteredLogs.length - 12} mais`}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );

  const renderReviews = () => {
    if (reviewEntries.length === 0) {
      return (
        <section>
          <SectionHeader title="Reviews" linkTo={`/profile/${profileUser?.username}/reviews`} count={reviewEntries.length} />
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma review ainda.</div>
        </section>
      );
    }
    return (
      <section>
        <SectionHeader title="Reviews" linkTo={`/profile/${profileUser?.username}/reviews`} count={reviewEntries.length} />
        <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 lg:hidden">
          {reviewEntries.slice(0, 10).map(e => {
            const m = TYPE_META[e.log.media_item.media_type];
            return (
              <Link key={e.review.id} to={getLogUrl(e.log.media_item)} className="flex w-[260px] shrink-0 gap-3 rounded-2xl p-3 transition-colors hover:bg-white/5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {e.log.media_item.cover_image_url ? (
                  <img src={e.log.media_item.cover_image_url} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} loading="lazy" />
                ) : (
                  <div className="h-24 w-16 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-sm">{m?.emoji || '📄'}</span>
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-xs font-semibold text-white/80">{e.log.media_item.title}</p>
                  {e.review.rating != null && e.review.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--mdf-yellow)" stroke="var(--mdf-yellow)" strokeWidth="1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span className="text-[11px] font-bold text-white/80">{e.review.rating}</span>
                    </div>
                  )}
                  {e.review.review_text && <p className="line-clamp-3 text-[10px] leading-relaxed text-white/50">{e.review.review_text}</p>}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="hidden lg:grid lg:grid-cols-2 gap-3">
          {reviewEntries.slice(0, 6).map(e => {
            const m = TYPE_META[e.log.media_item.media_type];
            return (
              <Link key={e.review.id} to={getLogUrl(e.log.media_item)} className="flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {e.log.media_item.cover_image_url ? (
                  <img src={e.log.media_item.cover_image_url} alt="" className="h-28 w-[72px] shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} loading="lazy" />
                ) : (
                  <div className="h-28 w-[72px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-lg">{m?.emoji || '📄'}</span>
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white/80">{e.log.media_item.title}</p>
                    {e.log.platform && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: (m?.color || '#666') + '22', color: m?.color }}>{e.log.platform}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {e.review.rating != null && e.review.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {getStars(e.review.rating).map((star, i) => (
                          <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                            fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                            stroke="var(--mdf-yellow)" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-white/30">{new Date(e.review.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {e.review.review_text && <p className="line-clamp-4 text-[13px] leading-relaxed text-white/50 flex-1">{e.review.review_text.length > 320 ? e.review.review_text.slice(0, 320) + '…' : e.review.review_text}</p>}
                  {e.log.hours_spent != null && e.log.hours_spent > 0 && (
                    <div className="text-[10px] text-white/40 font-mono">{e.log.hours_spent}h</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  const renderAllItems = () => (
    <section>
      <SectionHeader title="Todos" count={filteredLogs.length} />
      {filteredLogs.length === 0 ? (
        <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma mídia registrada.</div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
          {(showExpanded.all ? filteredLogs : filteredLogs.slice(0, 12)).map(log => (
            <YgpCard key={log.id} log={log} accentColor={accentColor} />
          ))}
          {filteredLogs.length > 12 && (
            <button onClick={() => toggleExpand('all')} className="flex flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', aspectRatio: '3/4' }}>
              <span className="text-lg font-bold text-white/40">{showExpanded.all ? '−' : '+'}</span>
              <span className="text-[10px] text-white/30">{showExpanded.all ? 'Recolher' : `${filteredLogs.length - 12} mais`}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );

  const renderCustomLists = () => {
    if (filteredCustomLists.length === 0) {
      return (
        <section>
          <SectionHeader title="Listas Personalizadas" linkTo={`/profile/${profileUser?.username}/lists`} count={filteredCustomLists.length} />
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma lista personalizada.</div>
        </section>
      );
    }
    return (
      <section>
        <SectionHeader title="Listas Personalizadas" linkTo={`/profile/${profileUser?.username}/lists`} count={filteredCustomLists.length} />
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
    );
  };

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    top_5: renderTop5,
    recent: renderRecent,
    in_progress: () => renderStatusSection('in_progress'),
    completed: () => renderStatusSection('completed'),
    wishlist: () => renderStatusSection('wishlist'),
    library: () => renderStatusSection('library'),
    dropped: () => renderStatusSection('dropped'),
    reviews: renderReviews,
    all_items: renderAllItems,
    custom_lists: renderCustomLists,
  };

  return (
    <div className="space-y-10">
      <ProfileHero
        profileUser={profileUser}
        currentUser={currentUser}
        logs={logs}
        isOwnProfile={isOwnProfile}
        isFollowing={false}
        followLoading={false}
        onFollowToggle={() => {}}
        accentColor={accentColor}
        activeMediaType={mediaType}
        onEditLayout={isOwnProfile ? () => setEditingLayout(true) : undefined}
      />

      {effectiveSections.map(section => {
        if (!section.visible) return null;
        const renderer = sectionRenderers[section.id];
        if (!renderer) return null;
        return <div key={section.id}>{renderer()}</div>;
      })}

      {editingLayout && (
        <LayoutEditorModal
          sections={effectiveSections}
          availableSections={MEDIA_SECTION_DEFS}
          onSave={handleSaveLayout}
          onClose={() => setEditingLayout(false)}
        />
      )}
    </div>
  );
};

export default MediaTypeProfilePage;
