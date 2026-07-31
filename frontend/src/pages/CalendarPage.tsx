import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, MediaType } from '../types';
import { ChevronLeft, ChevronRight, Gamepad2, Film, Tv, Book } from 'lucide-react';
import { startOfMonth, addMonths, subMonths, isSameMonth, isSameDay, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getLogUrl } from '../utils';

interface CalendarPageProps {
  user: { id: number; username: string };
}

const ICONS: Record<MediaType, typeof Film> = { game: Gamepad2, movie: Film, series: Tv, book: Book };

const TYPE_COLORS: Record<MediaType, string> = {
  game: '#60a5fa',
  movie: '#fbbf24',
  series: '#ef4444',
  book: '#4ade80',
};

const CalendarPage = ({ user }: CalendarPageProps) => {
  const [current, setCurrent] = useState(new Date());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);

  const start = startOfMonth(current);
  const gridStart = startOfWeek(start, { weekStartsOn: 0 });
  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (arr.length < 42) { arr.push(d); d = new Date(d.getTime() + 24 * 60 * 60 * 1000); }
    return arr;
  }, [gridStart]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('/media/logs', { params: { user_id: user.id, limit: 500 } });
      setLogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }, [user.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const logsByDate = useMemo(() => {
    const m: Record<string, LogEntry[]> = {};
    logs.forEach(l => {
      const key = new Date(l.log_date).toISOString().split('T')[0];
      (m[key] = m[key] || []).push(l);
    });
    return m;
  }, [logs]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6 max-w-[1844px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black tracking-tight capitalize">
          {format(current, "MMMM 'de' yyyy", { locale: ptBR })}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(subMonths(current, 1))}
            className="w-10 h-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrent(new Date())} className="mdf-btn-ghost text-sm">Hoje</button>
          <button onClick={() => setCurrent(addMonths(current, 1))}
            className="w-10 h-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mdf-card p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">
          {weekDays.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const key = format(d, 'yyyy-MM-dd');
            const items = logsByDate[key] || [];
            const out = !isSameMonth(d, current);
            const isSel = selected && isSameDay(d, selected);
            const isToday = isSameDay(d, new Date());
            return (
              <button key={i} onClick={() => setSelected(d)}
                className={`rounded-lg p-1.5 text-left transition-colors relative overflow-hidden ${
                  out ? 'opacity-30' : ''
                } ${isSel ? 'ring-2 ring-[var(--mdf-green)]' : 'border border-white/5 hover:border-white/15'} ${
                  items.length > 0 ? 'bg-[var(--mdf-surface-2)]' : 'bg-[var(--mdf-surface)]'
                }`}
                style={{ aspectRatio: '1 / 1.15' }}>
                <div className={`text-xs font-mono absolute top-1.5 left-1.5 z-10 ${isToday ? 'text-[var(--mdf-green)] font-bold' : 'text-white/60'}`}>
                  {format(d, 'd')}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-[3px]">
                  {items.slice(0, 8).map((it, k) => {
                    const Icon = ICONS[it.media_item.media_type] || Film;
                    const typeColor = TYPE_COLORS[it.media_item.media_type] || '#666';
                    return (
                      <div key={k} className="aspect-square rounded flex items-center justify-center"
                        style={{ background: typeColor + '33' }}
                        title={it.media_item.title}>
                        <Icon size={14} style={{ color: typeColor }} />
                      </div>
                    );
                  })}
                  {items.length > 8 && (
                    <div className="aspect-square rounded flex items-center justify-center bg-white/5"
                      title={`${items.length - 8} mais`}>
                      <span className="text-[10px] text-white/50 font-mono">...</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="mdf-card p-5">
          <div className="text-sm text-white/50 uppercase tracking-[0.2em] mb-3">
            {format(selected, 'EEEE, dd MMMM', { locale: ptBR })}
          </div>
          {(logsByDate[format(selected, 'yyyy-MM-dd')] || []).length === 0 ? (
            <div className="text-white/50 text-sm">Nada logado neste dia.</div>
          ) : (
            <ul className="space-y-2">
              {(logsByDate[format(selected, 'yyyy-MM-dd')] || []).map((it) => {
                const Icon = ICONS[it.media_item.media_type] || Film;
                const typeColor = TYPE_COLORS[it.media_item.media_type] || '#666';
                return (
                  <li key={it.id}>
                    <Link to={getLogUrl(it.media_item)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      {it.media_item.cover_image_url ? (
                        <img src={it.media_item.cover_image_url} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: typeColor + '22' }}>
                          <Icon size={14} style={{ color: typeColor }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: typeColor }} />
                          <span className="font-semibold truncate">{it.media_item.title}</span>
                          {it.is_favorite && (
                            <span className="text-[var(--mdf-pink)] text-xs">♥</span>
                          )}
                        </div>
                        {it.platform && <div className="text-xs text-white/50 mt-0.5">{it.platform}</div>}
                        {it.rating != null && (
                          <div className="text-xs text-[var(--mdf-yellow)] mt-0.5">★ {it.rating.toFixed(1)}</div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
