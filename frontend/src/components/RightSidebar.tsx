import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import StatsSection from './sections/StatsSection';
import RatingDistribution from './sections/RatingDistribution';
import GenreChart from './sections/GenreChart';
import ActivityGraph from './sections/ActivityGraph';
import type { LogEntry, User } from '../types';

interface RightSidebarProps {
  user: User;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const MEDIA_TYPE_MAP: Record<string, string> = {
  movies: 'movie',
  tvshows: 'series',
  books: 'book',
  games: 'game',
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

const RightSidebar = ({ user, isCollapsed, onToggleCollapse }: RightSidebarProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const location = useLocation();

  const pathSegments = location.pathname.split('/');
  const routeMediaTypeSlug = pathSegments[3]; // e.g. /profile/username/movies -> 'movies'
  const activeMediaType = MEDIA_TYPE_MAP[routeMediaTypeSlug];

  useEffect(() => {
    if (user?.id) {
      api.get('/media/logs', { params: { user_id: user.id } })
        .then((res) => setLogs(res.data || []))
        .catch((err) => console.error('Failed to fetch logs for right sidebar', err));
    } else {
      setLogs([]);
    }
  }, [user?.id, location.pathname]);

  const accentColor = user.accent_color || '#00e054';
  const currentMediaColor = activeMediaType ? MEDIA_COLORS[activeMediaType] : accentColor;

  if (isCollapsed) {
    return (
      <aside className="fixed top-0 right-0 h-screen w-14 border-l flex flex-col items-center py-4 z-40"
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

  return (
    <aside className="fixed top-0 right-0 h-screen w-[432px] p-4 border-l flex flex-col z-40 overflow-y-auto space-y-3 right-sidebar"
      style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}>

      <div className="flex items-center justify-between mb-1 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'var(--text)' }}
            title="Recolher barra lateral"
          >
            <ChevronRight size={18} />
          </button>
          <h3 className="font-display font-bold text-base -tracking-tight">
            Analytics {activeMediaType ? `(${PAGE_LABELS[activeMediaType]})` : ''}
          </h3>
        </div>
        <div className="h-1 w-12" style={{ background: currentMediaColor, opacity: 0.3 }} />
      </div>

      <div className="space-y-3 pb-8">
        <div className="transform scale-95 origin-top-left">
          <StatsSection logs={logs} accentColor={currentMediaColor} mediaType={activeMediaType} />
        </div>
        
        <div className="transform scale-95 origin-top-left">
          <RatingDistribution logs={logs} color={currentMediaColor} mediaType={activeMediaType} />
        </div>

        <div className="transform scale-95 origin-top-left">
          <GenreChart logs={logs} accentColor={currentMediaColor} mediaType={activeMediaType} />
        </div>

        <div className="mdf-card p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Mapa de Atividade</div>
          <ActivityGraph logs={logs} mediaType={activeMediaType} />
        </div>

        <div className="mdf-card p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Atividade Recente</div>
          {logs.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[...logs]
                .filter(l => !activeMediaType || l.media_item.media_type === activeMediaType)
                .sort((a, b) => b.id - a.id)
                .slice(0, 6)
                .map(log => (
                  <Link key={log.id} to={`/log/${log.id}`} className="w-14 h-20 rounded-md overflow-hidden flex-shrink-0 relative group border" style={{ borderColor: 'var(--border)' }} title={log.media_item.title}>
                    {log.media_item.cover_image_url ? (
                      <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 bg-white/5">
                        {log.media_item.title}
                      </div>
                    )}
                  </Link>
                ))}
            </div>
          ) : (
            <div className="text-[11px] text-white/40 py-2 text-center">Nenhum log recente</div>
          )}
        </div>

        <div className="mdf-card p-3">
          <h4 className="font-display font-semibold text-xs mb-1" style={{ color: 'var(--text-primary)' }}>
            Conquistas e Medalhas
          </h4>
          <div className="text-[11px] text-white/40 py-2 text-center">Em breve...</div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
