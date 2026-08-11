import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { resolveUserByUsername } from '../services/api';
import type { LogEntry, MediaType, User } from '../types';
import { Heart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TYPE_META } from '../constants/designSystem';
import { getLogUrl, formatHours } from '../utils';
import HashtagText from '../components/HashtagText';

interface DiaryPageProps {
  currentUser: User;
}

const FILTERS: { key: MediaType | 'all'; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'game', label: 'Jogos' },
  { key: 'movie', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
  { key: 'book', label: 'Livros' },
];

const groupByDate = (logs: LogEntry[]) => {
  const groups: Record<string, LogEntry[]> = {};
  logs.forEach(l => {
    const d = l.log_date.split('T')[0];
    (groups[d] = groups[d] || []).push(l);
  });
  return Object.entries(groups)
    .map(([date, items]) => [date, items.sort((a, b) => b.log_date.localeCompare(a.log_date))] as const)
    .sort((a, b) => b[0].localeCompare(a[0]));
};

const DiaryPage = ({ currentUser }: DiaryPageProps) => {
  const { username } = useParams<{ username: string }>();
  const [filter, setFilter] = useState<MediaType | 'all'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      let targetUser = currentUser;
      if (username && username !== currentUser.username) {
        targetUser = await resolveUserByUsername(username);
      }
      const response = await api.get('/media/logs', { params: { user_id: targetUser.id, limit: 9999 } });
      setLogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }, [username, currentUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.media_item.media_type === filter);
  const sorted = [...filtered].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const groups = groupByDate(sorted);

  return (
    <div className="space-y-6 max-w-[1844px] mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="hidden lg:block font-display text-3xl font-black tracking-tight">Diário</h1>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === t.key ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="mdf-card p-10 text-center text-white/50">Nenhum log encontrado.</div>
      )}

      <div className="space-y-8">
        {groups.map(([date, items]) => (
          <div key={date} className="grid md:grid-cols-[140px_1fr] gap-4">
            <div className="text-right md:pr-4 md:border-r md:border-white/5 md:pt-1">
              <div className="font-display font-black text-2xl">{format(parseISO(date), 'dd')}</div>
              <div className="uppercase tracking-[0.2em] text-xs text-white/50">{format(parseISO(date), 'MMM · yyyy', { locale: ptBR })}</div>
            </div>
            <div className="space-y-2">
              {items.map(l => {
                return (
                  <Link key={l.id} to={getLogUrl(l.media_item)}
                    className="mdf-card mdf-card-hover flex items-stretch gap-4 p-3 transition-colors">
                    <div className="w-[72px] -my-3 -ml-3 flex-shrink-0 overflow-hidden bg-white/5" style={{borderBottom: '3px solid ' + (TYPE_META[l.media_item.media_type]?.color || '#666')}}>
                      {l.media_item.cover_image_url ? (
                        <img src={l.media_item.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/40">{l.media_item.title.charAt(0).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">{l.media_item.title}</div>
                        {l.is_favorite && <Heart size={12} className="text-[var(--mdf-pink)] flex-shrink-0" fill="var(--mdf-pink)" />}
                      </div>
                      {l.platform && <div className="text-xs text-white/50 mt-0.5">{l.platform}</div>}
                      {l.review && <p className="text-sm text-white/70 mt-1 line-clamp-2"><HashtagText text={l.review} /></p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {l.rating != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--mdf-yellow)] text-base">★</span>
                          <span className="text-sm font-mono">{l.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {l.hours_spent != null && l.hours_spent > 0 && (
                        <div className="text-xs text-white/40 font-mono">{formatHours(l.hours_spent)}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiaryPage;
