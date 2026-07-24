import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getUserWishlist } from '../services/api';
import type { LogEntry, MediaType } from '../types';
import type { MediaItem } from '../types/media';
import { Gamepad2, Film, Tv, Book, Pencil, Trash2 } from 'lucide-react';

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
  { key: 'in_progress', label: 'Em progresso' },
  { key: 'completed', label: 'Completos' },
  { key: 'platinated', label: 'Platinados' },
  { key: 'dropped', label: 'Abandonados' },
];

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'rgba(59,130,246,0.85)',
  completed: 'rgba(34,197,94,0.85)',
  dropped: 'rgba(239,68,68,0.85)',
  wishlist: 'rgba(168,85,247,0.85)',
  soon: 'rgba(168,85,247,0.85)',
  platinated: 'rgba(250,204,21,0.85)',
};

const STATUS_ICONS: Record<string, string> = {
  completed: '✓',
  in_progress: '•••',
  dropped: '💀',
  wishlist: '★',
  soon: '…',
};

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  movie: { emoji: '🎬', color: '#fbbf24' },
  series: { emoji: '📺', color: '#ef4444' },
  game: { emoji: '🎮', color: '#60a5fa' },
  book: { emoji: '📚', color: '#4ade80' },
};

const getStars = (rating?: number) => {
  if (!rating) return [];
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) stars.push('full');
    else if (i - 0.5 <= rating) stars.push('half');
    else stars.push('empty');
  }
  return stars;
};

const ListsPage = ({ user }: ListsPageProps) => {
  const [tab, setTab] = useState<MediaType | 'all'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wishlist, setWishlist] = useState<(LogEntry & { media_item: MediaItem })[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('/media/logs', { params: { user_id: user.id, limit: 500 } });
      setLogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }, [user.id]);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await getUserWishlist(user.id);
      setWishlist(response.data || []);
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    }
  }, [user.id]);

  useEffect(() => { fetchLogs(); fetchWishlist(); }, [fetchLogs, fetchWishlist]);

  const deleteWishlistItem = async (id: number) => {
    try {
      await api.delete(`/media/logs/${id}`);
      setWishlist(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to delete wishlist item', err);
    }
  };

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

      {filteredLogs.length === 0 && wishlist.length === 0 && (
        <div className="mdf-card p-10 text-center text-white/50">Nada aqui ainda.</div>
      )}

      {grouped.map(g => (
        <section key={g.key}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-xl font-bold">{g.label}</h2>
            <div className="text-xs text-white/40 uppercase tracking-[0.2em]">{g.items.length}</div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {g.items.map(l => {
              const typeEmoji = TYPE_META[l.media_item.media_type]?.emoji || '📄';
              return (
                <Link key={l.id} to={`/log/${l.id}`} className="poster-tile block group" style={{borderBottom: '3px solid ' + (TYPE_META[l.media_item.media_type]?.color || '#666')}}>
                  {l.media_item.cover_image_url ? (
                    <img src={l.media_item.cover_image_url} alt={l.media_item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                      <span className="text-3xl">{typeEmoji}</span>
                      <div className="text-xs text-white/70 font-medium line-clamp-3">{l.media_item.title}</div>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none"
                       style={{background:'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)'}}>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="text-white text-xs font-semibold truncate">{l.media_item.title}</div>
                      {l.rating && l.rating > 0 && (
                        <div className="mt-1 flex items-center gap-0.5">
                          {getStars(l.rating).map((star, i) => (
                            <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                              fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                              stroke="var(--mdf-yellow)" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {l.is_favorite && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:'var(--mdf-pink)'}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </div>
                    )}
                    {l.status && !l.is_favorite && (
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{background: STATUS_COLORS[l.status] || 'rgba(100,100,100,0.85)'}}>
                        {STATUS_ICONS[l.status] || l.status[0].toUpperCase()}
                      </span>
                    )}
                    {l.media_item.media_type === 'game' && l.unlocked_achievements != null && l.total_achievements != null && l.total_achievements > 0 && (
                      <span className="h-6 px-1.5 flex items-center justify-center text-[9px] font-bold backdrop-blur-sm rounded-full" style={{ background: l.unlocked_achievements === l.total_achievements ? 'rgba(250,204,21,0.85)' : 'rgba(0,0,0,0.7)', color: l.unlocked_achievements === l.total_achievements ? '#000' : '#fff' }}>
                        {l.unlocked_achievements === l.total_achievements ? '100%' : `${l.unlocked_achievements}/${l.total_achievements}`}
                      </span>
                    )}
                  </div>
                  {l.platform && (
                    <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {l.platform}
                    </div>
                  )}
                  {(l.relog_count ?? 0) > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {(l.relog_count ?? 0) + 1}x
                    </div>
                  ) : l.media_item.media_type === 'series' && l.watched_episodes != null && l.total_episodes != null && l.total_episodes > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {l.watched_episodes}/{l.total_episodes}
                    </div>
                  ) : l.media_item.media_type === 'game' && l.hours_spent != null && l.hours_spent > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {l.hours_spent}h
                    </div>
                  ) : l.media_item.media_type === 'book' && l.hours_spent != null && l.hours_spent > 0 ? (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                      {l.hours_spent}h
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* Wishlist Section */}
      {(() => {
        const filteredWishlist = tab === 'all' ? wishlist : wishlist.filter(l => l.media_item.media_type === tab);
        if (filteredWishlist.length === 0) return null;
        return (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-bold">Pretendo</h2>
              <div className="text-xs text-white/40 uppercase tracking-[0.2em]">{filteredWishlist.length}</div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {filteredWishlist.map(l => {
                const typeEmoji = TYPE_META[l.media_item.media_type]?.emoji || '📄';
                return (
                  <div key={l.id} className="poster-tile block group relative" style={{borderBottom: '3px solid ' + (TYPE_META[l.media_item.media_type]?.color || '#666')}}>
                    {l.media_item.cover_image_url ? (
                      <img src={l.media_item.cover_image_url} alt={l.media_item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                        <span className="text-3xl">{typeEmoji}</span>
                        <div className="text-xs text-white/70 font-medium line-clamp-3">{l.media_item.title}</div>
                      </div>
                    )}
                    <div className="absolute inset-0 pointer-events-none"
                         style={{background:'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)'}}>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="text-white text-xs font-semibold truncate">{l.media_item.title}</div>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{background: 'rgba(168,85,247,0.85)'}}>
                        ★
                      </span>
                    </div>
                    {l.platform && (
                      <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                        {l.platform}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Link to={`/new-log?edit=${l.id}`} onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-colors">
                        <Pencil size={12} />
                      </Link>
                      <button onClick={(e) => { e.stopPropagation(); deleteWishlistItem(l.id); }}
                        className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-red-400 backdrop-blur-sm transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
};

export default ListsPage;
