import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { resolveUserByUsername } from '../services/api';
import type { LogEntry, User, MediaType } from '../types';
import { Heart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TYPE_META } from '../constants/designSystem';
import HashtagText from '../components/HashtagText';
import { getLogUrl } from '../utils';

interface ReviewsPageProps {
  currentUser: User;
}

const FILTERS: { key: MediaType | 'all'; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'game', label: 'Jogos' },
  { key: 'movie', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
  { key: 'book', label: 'Livros' },
];

const ReviewsPage = ({ currentUser }: ReviewsPageProps) => {
  const [filter, setFilter] = useState<MediaType | 'all'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const { username } = useParams<{ username: string }>();
  const displayUsername = username || currentUser.username;

  const fetchLogs = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    try {
      let targetUser = currentUser;
      targetUser = await resolveUserByUsername(displayUsername);
      if (requestId !== fetchIdRef.current) return;
      const response = await api.get('/media/logs', { params: { user_id: targetUser.id, limit: 9999, light: true } });
      if (requestId !== fetchIdRef.current) return;
      const allLogs = response.data || [];
      setLogs(allLogs);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      if (requestId === fetchIdRef.current) setLoading(false);
    }
  }, [currentUser, displayUsername]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const allReviewEntries = useMemo(() => {
    return logs
      .filter(l => l.review && l.review.trim().length > 0)
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
  }, [logs]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allReviewEntries;
    return allReviewEntries.filter(e => e.media_item.media_type === filter);
  }, [allReviewEntries, filter]);

  const groups = useMemo(() => {
    const g: Record<string, LogEntry[]> = {};
    filtered.forEach(e => {
      const d = e.log_date.split('T')[0];
      (g[d] = g[d] || []).push(e);
    });
    return Object.entries(g)
      .map(([date, items]) => [date, items] as const)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (loading) {
    return <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-[1844px] mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="hidden lg:block">
          <h1 className="font-display text-3xl font-black tracking-tight">Reviews</h1>
          <div className="text-white/50 text-sm mt-1">@{displayUsername} · {allReviewEntries.length} review{allReviewEntries.length !== 1 ? 's' : ''}</div>
        </div>
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
        <div className="mdf-card p-10 text-center text-white/50">Nenhuma review encontrada.</div>
      )}

      <div className="space-y-8">
        {groups.map(([date, items]) => (
          <div key={date} className="grid md:grid-cols-[140px_1fr] gap-4">
            <div className="text-right md:pr-4 md:border-r md:border-white/5 md:pt-1">
              <div className="font-display font-black text-2xl">{format(parseISO(date), 'dd')}</div>
              <div className="uppercase tracking-[0.2em] text-xs text-white/50">{format(parseISO(date), 'MMM · yyyy', { locale: ptBR })}</div>
            </div>
            <div className="space-y-2">
              {items.map(e => {
                const meta = TYPE_META[e.media_item.media_type];
                return (
                  <Link key={e.id} to={getLogUrl(e.media_item)}
                    className="mdf-card mdf-card-hover flex items-stretch gap-4 p-3 transition-colors">
                    <div className="w-[72px] -my-3 -ml-3 flex-shrink-0 overflow-hidden bg-white/5" style={{borderBottom: '3px solid ' + (meta?.color || '#666')}}>
                      {e.media_item.cover_image_url ? (
                        <img src={e.media_item.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-white/40">{e.media_item.title.charAt(0).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">{e.media_item.title}</div>
                        {e.is_favorite && <Heart size={12} className="text-[var(--mdf-pink)] flex-shrink-0" fill="var(--mdf-pink)" />}
                      </div>
                      {e.platform && <div className="text-xs text-white/50 mt-0.5">{e.platform}</div>}
                      {e.review && <p className="text-sm text-white/70 mt-1 line-clamp-2"><HashtagText text={e.review} /></p>}
                      {!e.review && <p className="text-xs text-white/30 italic mt-1">Sem review</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {e.rating != null && e.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--mdf-yellow)] text-base">★</span>
                          <span className="text-sm font-mono">{e.rating.toFixed(1)}</span>
                        </div>
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

export default ReviewsPage;
