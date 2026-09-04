import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import StatsSection from './sections/StatsSection';
import RatingDistribution from './sections/RatingDistribution';
import GenreChart from './sections/GenreChart';
import ActivityGraph from './sections/ActivityGraph';
import HoursPieChart from './sections/HoursPieChart';
import BadgesSection from './sections/BadgesSection';
import type { SidebarData, TopListItem, User, SidebarRecentMedia } from '../types';

interface RightSidebarProps {
  user: User;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  previewOrder?: string[];
  embedded?: boolean;
}

const MEDIA_TYPE_MAP: Record<string, string> = {
  movies: 'movie',
  tvshows: 'series',
  books: 'book',
  games: 'game',
};

const MEDIA_TO_CATEGORY: Record<string, string> = {
  movie: 'movies',
  series: 'series',
  book: 'books',
  game: 'games',
};

const PAGE_LABELS: Record<string, string> = {
  movie: 'Filmes',
  series: 'Séries',
  book: 'Livros',
  game: 'Jogos',
};

const MEDIA_COLORS: Record<string, string> = {
  movie: '#fbbf24',
  series: '#ef4444',
  game: '#60a5fa',
  book: '#4ade80',
};

const recentMediaUrl = (media: SidebarRecentMedia): string => {
  if (!media.media_type) return '/';
  let apiId: string | null = null;
  if (media.steam_appid) apiId = String(media.steam_appid);
  else if (media.igdb_id) apiId = String(media.igdb_id);
  else if (media.tmdb_id) apiId = String(media.tmdb_id);
  else if (media.google_books_id) apiId = media.google_books_id;
  else apiId = String(media.id);
  return `/media/${media.media_type}/${apiId}`;
};

const RightSidebar = ({ user, isCollapsed, onToggleCollapse, previewOrder, embedded = false }: RightSidebarProps) => {
  const [data, setData] = useState<SidebarData | null>(null);
  const [topListItems, setTopListItems] = useState<TopListItem[]>([]);
  const location = useLocation();

  const pathSegments = location.pathname.split('/');
  const routeMediaTypeSlug = pathSegments[3];
  const searchParams = new URLSearchParams(location.search);
  const viewParam = searchParams.get('view');
  const activeMediaType = MEDIA_TYPE_MAP[routeMediaTypeSlug] || MEDIA_TYPE_MAP[viewParam || ''];

  useEffect(() => {
    if (user?.id) {
      const params: Record<string, unknown> = { user_id: user.id };
      if (activeMediaType) params.media_type = activeMediaType;
      api.get('/media/users/' + user.id + '/sidebar', { params })
        .then((res) => setData(res.data || null))
        .catch((err) => console.error('Failed to fetch sidebar data', err));
      api.get(`/media/users/${user.id}/top-list`)
        .then((res) => setTopListItems(res.data || []))
        .catch((err) => console.error('Failed to fetch favorites for right sidebar', err));
    } else {
      setData(null);
      setTopListItems([]);
    }
  }, [user?.id, activeMediaType]);

  const orderedTopList = useMemo(() => {
    const order = ['game', 'movie', 'series', 'book'];
    return [...topListItems].sort((a, b) => {
      const ta = order.indexOf(a.media_item?.media_type || '');
      const tb = order.indexOf(b.media_item?.media_type || '');
      if (ta !== tb) return ta - tb;
      return (a.position || 0) - (b.position || 0);
    });
  }, [topListItems]);

  const sidebarOrder = useMemo(() => {
    const defaults = ['favorites', 'top_5', 'rating_distribution', 'stats', 'top_genres', 'hours', 'activity_map', 'recent_activity', 'badges'];
    if (previewOrder) return previewOrder;
    try {
      const raw = user?.section_order;
      if (raw) {
        const parsed = JSON.parse(raw);
        const category = activeMediaType ? MEDIA_TO_CATEGORY[activeMediaType] : null;
        const sidebar = (category && parsed?.[category]?.sidebar)
          || parsed?.general?.sidebar
          || parsed?.sidebar;
        if (Array.isArray(sidebar)) {
          const configMap = new Map(sidebar.map((s: { id: string; visible?: boolean }) => [s.id, s.visible]));
          const order = sidebar.map((s: { id: string }) => s.id);
          const ordered = defaults.filter(id => order.includes(id)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
          for (const d of defaults) if (!order.includes(d)) ordered.push(d);
          return ordered.filter(id => configMap.get(id) !== false);
        }
      }
    } catch {}
    return defaults.filter((id) => !(id === 'favorites' || id === 'top_5' || (activeMediaType && id === 'badges')));
  }, [user?.section_order, activeMediaType, previewOrder]);

  const accentColor = user.accent_color || '#00e054';
  const currentMediaColor = activeMediaType ? MEDIA_COLORS[activeMediaType] : accentColor;

  if (isCollapsed && !embedded) {
    return (
      <aside className="hidden lg:flex fixed top-0 right-0 h-screen w-14 border-l flex-col items-center py-4 z-40"
        style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}>
        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: 'var(--text)' }}
          title="Expandir barra lateral"
        >
          <ChevronLeft size={20} />
        </button>
      </aside>
    );
  }

  const miniPoster = (item: TopListItem, rank?: number) => {
    const media = item.media_item;
    if (!media) return null;
    return (
      <Link key={item.id} to={`/media/${media.media_type}/${media.igdb_id ?? media.steam_appid ?? media.tmdb_id ?? media.google_books_id ?? media.id}`} className="w-[44px] h-[60px] rounded-md overflow-hidden flex-shrink-0 relative group border" style={{ borderColor: 'var(--border)', borderBottom: '3px solid ' + (MEDIA_COLORS[media.media_type] || '#666') }} title={media.title}>
        {media.cover_image_url ? (
          <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 bg-white/5">{media.title}</div>
        )}
        {rank != null && (
          <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>{rank}</span>
        )}
      </Link>
    );
  };

  const renderRecentItem = (item: SidebarRecentMedia) => (
    <Link
      key={item.id}
      to={recentMediaUrl(item)}
      className="w-[44px] h-[60px] rounded-md overflow-hidden flex-shrink-0 relative group border"
      style={{ borderColor: 'var(--border)', borderBottom: '3px solid ' + (MEDIA_COLORS[item.media_type || ''] || '#666') }}
      title={item.title}
    >
      {item.cover_image_url ? (
        <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 bg-white/5">
          {item.title}
        </div>
      )}
    </Link>
  );

  const renderBlock = (id: string) => {
    switch (id) {
      case 'favorites':
        return (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Favoritos</div>
            {orderedTopList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {orderedTopList.slice(0, 10).map(item => miniPoster(item))}
              </div>
            ) : (
              <div className="text-[11px] text-white/40 py-2 text-center">Nenhum favorito</div>
            )}
          </>
        );
      case 'top_5':
        return (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Top 5</div>
            {orderedTopList.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {orderedTopList.slice(0, 5).map((item, i) => miniPoster(item, i + 1))}
              </div>
            ) : (
              <div className="text-[11px] text-white/40 py-2 text-center">Nenhum favorito</div>
            )}
          </>
        );
      case 'stats':
        return data ? <StatsSection stats={data.stats} accentColor={currentMediaColor} mediaType={activeMediaType} /> : null;
      case 'rating_distribution':
        return data ? <RatingDistribution rating={data.rating} color={currentMediaColor} mediaType={activeMediaType} /> : null;
      case 'top_genres':
        return data ? <GenreChart genres={data.genres} accentColor={currentMediaColor} mediaType={activeMediaType} /> : null;
      case 'hours':
        return !activeMediaType && data ? <HoursPieChart hours_by_type={data.hours_by_type} /> : null;
      case 'activity_map':
        return (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Mapa de Atividade</div>
            {data ? <ActivityGraph activity={data.activity} mediaType={activeMediaType} /> : null}
          </>
        );
      case 'recent_activity':
        return (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Logs recentes</div>
            {data && data.recent.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {data.recent.map((r) => renderRecentItem(r.media_item))}
              </div>
            ) : (
              <div className="text-[11px] text-white/40 py-2 text-center">Nenhum log recente</div>
            )}
          </>
        );
      case 'badges':
        return (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Medalhas</div>
            <BadgesSection userId={user.id} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <aside className={embedded
      ? "flex flex-col w-full p-4 overflow-y-auto space-y-3 right-sidebar"
      : "hidden lg:flex fixed top-0 right-0 h-screen w-[324px] p-4 border-l flex-col z-40 overflow-y-auto space-y-3 right-sidebar"}
      style={embedded ? undefined : { background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}>

      <div className="flex items-center justify-between mb-1 pt-1">
        <div className="flex items-center gap-2">
          {!embedded && (
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'var(--text)' }}
              title="Recolher barra lateral"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <h3 className="font-display font-bold text-base -tracking-tight">
            Analytics {activeMediaType ? `(${PAGE_LABELS[activeMediaType]})` : ''}
          </h3>
        </div>
        <div className="h-1 w-12" style={{ background: currentMediaColor, opacity: 0.3 }} />
      </div>

      <div className="space-y-2 pb-8">
        {sidebarOrder.filter(id => renderBlock(id) !== null).map(id => (
          <div key={id} className="mdf-card p-3">
            {renderBlock(id)}
          </div>
        ))}
      </div>
    </aside>
  );
};
export default RightSidebar;
