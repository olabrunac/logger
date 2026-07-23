import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { LogEntry, MediaType } from '../types';
import { Gamepad2, Film, Tv, Book } from 'lucide-react';

interface ListsPageProps {
  user: { id: number; username: string };
}

const TYPES: { key: MediaType | 'all'; label: string; icon: typeof Film; color: string }[] = [
  { key: 'all', label: 'Tudo', icon: Film, color: 'var(--mdf-green)' },
  { key: 'game', label: 'Jogos', icon: Gamepad2, color: 'var(--mdf-green)' },
  { key: 'movie', label: 'Filmes', icon: Film, color: 'var(--mdf-pink)' },
  { key: 'series', label: 'Séries', icon: Tv, color: 'var(--mdf-yellow)' },
  { key: 'book', label: 'Livros', icon: Book, color: '#9CB3C9' },
];

const STATUS_GROUPS: { key: string; label: string }[] = [
  { key: 'wishlist', label: 'Lista de desejos' },
  { key: 'soon', label: 'Em breve' },
  { key: 'in_progress', label: 'Em progresso' },
  { key: 'completed', label: 'Completos' },
  { key: 'platinated', label: 'Platinados' },
  { key: 'dropped', label: 'Abandonados' },
];

const ListsPage = ({ user }: ListsPageProps) => {
  const [tab, setTab] = useState<MediaType | 'all'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('/media/logs', { params: { user_id: user.id, limit: 500 } });
      setLogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }, [user.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = tab === 'all' ? logs : logs.filter(l => l.media_item.media_type === tab);

  const grouped = STATUS_GROUPS.map(g => ({
    ...g,
    items: filteredLogs.filter(l => l.status === g.key),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-black tracking-tight">Listas</h1>

      <div className="flex gap-1 flex-wrap">
        {TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {filteredLogs.length === 0 && (
        <div className="mdf-card p-10 text-center text-white/50">Nada aqui ainda.</div>
      )}

      {grouped.map(g => (
        <section key={g.key}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-xl font-bold">{g.label}</h2>
            <div className="text-xs text-white/40 uppercase tracking-[0.2em]">{g.items.length}</div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {g.items.map(l => (
              <Link key={l.id} to={`/log/${l.id}`} className="group">
                <div className="poster-tile">
                  {l.media_item.cover_image_url ? (
                    <img src={l.media_item.cover_image_url} alt={l.media_item.title} loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--mdf-surface-2)]">
                      {(() => { const Ic = TYPES.find(t => t.key === l.media_item.media_type)?.icon || Film; return <Ic size={24} className="text-white/30" />; })()}
                    </div>
                  )}
                </div>
                <div className="mt-1.5 px-0.5">
                  <div className="text-xs font-semibold truncate group-hover:text-[var(--mdf-green)] transition-colors">{l.media_item.title}</div>
                  {l.rating != null && <div className="text-[10px] text-[var(--mdf-yellow)]">★ {l.rating.toFixed(1)}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ListsPage;
