import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getUserWishlist, getUserCustomLists, createCustomList, updateCustomList, deleteCustomList, addCustomListItem, removeCustomListItem } from '../services/api';
import type { LogEntry, MediaType, CustomList, CustomListItem } from '../types';
import type { MediaItem } from '../types/media';
import { Gamepad2, Film, Tv, Book, Pencil, Trash2, Plus, ChevronDown, ChevronRight, X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

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

const ListFormModal = ({ open, onClose, onSave, initial }: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  initial?: { name: string; description: string };
}) => {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');

  useEffect(() => {
    setName(initial?.name || '');
    setDescription(initial?.description || '');
  }, [initial, open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="mdf-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold mb-4">{initial ? 'Editar Lista' : 'Nova Lista'}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Favoritos de 2024"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva sua lista..."
              rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">Cancelar</button>
          <button onClick={() => { if (name.trim()) onSave(name.trim(), description.trim()); }}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition-colors disabled:opacity-40"
            style={{ background: 'var(--mdf-green)' }}>Salvar</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const AddMediaModal = ({ open, onClose, userId, listId, onAdded }: {
  open: boolean;
  onClose: () => void;
  userId: number;
  listId: number;
  onAdded: (item: CustomListItem) => void;
}) => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MediaType>('movie');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get('/media/search', { params: { q: query, media_type: type } });
      setResults(res.data || []);
    } catch { setResults([]); }
    setLoading(false);
  }, [query, type]);

  useEffect(() => {
    const t = setTimeout(search, 500);
    return () => clearTimeout(t);
  }, [search]);

  const handleAdd = async (mediaItem: MediaItem) => {
    try {
      const res = await addCustomListItem(userId, listId, mediaItem);
      onAdded(res.data);
    } catch (err) {
      console.error('Failed to add item', err);
    }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="mdf-card p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Adicionar Mídia</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30" autoFocus />
          </div>
          <select value={type} onChange={e => setType(e.target.value as MediaType)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none">
            <option value="movie">Filmes</option>
            <option value="series">Séries</option>
            <option value="game">Jogos</option>
            <option value="book">Livros</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
          {loading && <div className="text-center text-white/40 py-6">Buscando...</div>}
          {!loading && results.length === 0 && query.trim() && (
            <div className="text-center text-white/40 py-6">Nenhum resultado</div>
          )}
          {results.map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
              {item.cover_image_url ? (
                <img src={item.cover_image_url} alt={item.title} className="w-10 h-14 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-14 rounded flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--mdf-surface-2)' }}>
                  {TYPE_META[item.media_type]?.emoji || '📄'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                <div className="text-xs text-white/40">{TYPE_META[item.media_type]?.emoji} {item.media_type}</div>
              </div>
              <button onClick={() => handleAdd(item)}
                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-all"
                style={{ background: 'var(--mdf-green)' }}>
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ListsPage = ({ user }: ListsPageProps) => {
  const [tab, setTab] = useState<MediaType | 'all'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wishlist, setWishlist] = useState<(LogEntry & { media_item: MediaItem })[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [expandedLists, setExpandedLists] = useState<Record<number, boolean>>({});
  const [showListForm, setShowListForm] = useState(false);
  const [editingList, setEditingList] = useState<{ id: number; name: string; description: string } | null>(null);
  const [addMediaListId, setAddMediaListId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get('/media/logs', { params: { user_id: user.id, limit: 500 } });
      setLogs(response.data || []);
    } catch (err) { console.error('Failed to fetch logs', err); }
  }, [user.id]);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await getUserWishlist(user.id);
      setWishlist(response.data || []);
    } catch (err) { console.error('Failed to fetch wishlist', err); }
  }, [user.id]);

  const fetchCustomLists = useCallback(async () => {
    try {
      const response = await getUserCustomLists(user.id);
      setCustomLists(response.data || []);
    } catch (err) { console.error('Failed to fetch custom lists', err); }
  }, [user.id]);

  useEffect(() => { fetchLogs(); fetchWishlist(); fetchCustomLists(); }, [fetchLogs, fetchWishlist, fetchCustomLists]);

  const deleteWishlistItem = async (id: number) => {
    try {
      await api.delete(`/media/logs/${id}`);
      setWishlist(prev => prev.filter(l => l.id !== id));
    } catch (err) { console.error('Failed to delete wishlist item', err); }
  };

  const handleSaveList = async (name: string, description: string) => {
    try {
      if (editingList) {
        const res = await updateCustomList(user.id, editingList.id, { name, description });
        setCustomLists(prev => prev.map(l => l.id === editingList.id ? res.data : l));
      } else {
        const res = await createCustomList(user.id, { name, description });
        setCustomLists(prev => [res.data, ...prev]);
      }
    } catch (err) { console.error('Failed to save list', err); }
    setShowListForm(false);
    setEditingList(null);
  };

  const handleDeleteList = async (listId: number) => {
    try {
      await deleteCustomList(user.id, listId);
      setCustomLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) { console.error('Failed to delete list', err); }
  };

  const handleRemoveItem = async (listId: number, itemId: number) => {
    try {
      await removeCustomListItem(user.id, listId, itemId);
      setCustomLists(prev => prev.map(l => {
        if (l.id !== listId) return l;
        return { ...l, items: l.items.filter(i => i.id !== itemId) };
      }));
    } catch (err) { console.error('Failed to remove item', err); }
  };

  const handleItemAdded = (listId: number, item: CustomListItem) => {
    setCustomLists(prev => prev.map(l => {
      if (l.id !== listId) return l;
      if (l.items.some(i => i.id === item.id)) return l;
      return { ...l, items: [...l.items, item] };
    }));
    setAddMediaListId(null);
  };

  const toggleListExpanded = (listId: number) => {
    setExpandedLists(prev => ({ ...prev, [listId]: !prev[listId] }));
  };

  const filteredLogs = tab === 'all' ? logs : logs.filter(l => l.media_item.media_type === tab);

  const grouped = STATUS_GROUPS.map(g => ({
    ...g,
    items: filteredLogs.filter(l => l.status === g.key),
  })).filter(g => g.items.length > 0);

  const filteredWishlist = tab === 'all' ? wishlist : wishlist.filter(l => l.media_item.media_type === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black tracking-tight">Listas</h1>
      </div>

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

      {filteredLogs.length === 0 && filteredWishlist.length === 0 && customLists.length === 0 && (
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

      {filteredWishlist.length > 0 && (
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
      )}

      {/* Custom Lists */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Listas Personalizadas</h2>
          <button onClick={() => { setEditingList(null); setShowListForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-colors hover:opacity-90"
            style={{ background: 'var(--mdf-green)' }}>
            <Plus size={14} /> Nova Lista
          </button>
        </div>

        {customLists.length === 0 && (
          <div className="mdf-card p-8 text-center text-white/40 text-sm">
            Crie listas personalizadas para organizar seus favoritos,listas de estudo, ou qualquer coisa.
          </div>
        )}

        <div className="space-y-3">
          {customLists.map(cl => {
            const isExpanded = expandedLists[cl.id] !== false;
            const filteredItems = tab === 'all' ? cl.items : cl.items.filter(i => i.media_item && i.media_item.media_type === tab);
            return (
              <div key={cl.id} className="mdf-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleListExpanded(cl.id)}>
                  {isExpanded ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{cl.name}</div>
                    {cl.description && <div className="text-xs text-white/40 truncate">{cl.description}</div>}
                  </div>
                  <div className="text-xs text-white/40">{filteredItems.length} itens</div>
                  <button onClick={(e) => { e.stopPropagation(); setAddMediaListId(cl.id); }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <Plus size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingList({ id: cl.id, name: cl.name, description: cl.description || '' }); setShowListForm(true); }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta lista?')) handleDeleteList(cl.id); }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    {filteredItems.length === 0 ? (
                      <div className="text-center text-white/30 text-xs py-4">Nenhum item ainda</div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                        {filteredItems.map(item => {
                          if (!item.media_item) return null;
                          const mi = item.media_item;
                          const typeEmoji = TYPE_META[mi.media_type]?.emoji || '📄';
                          return (
                            <div key={item.id} className="poster-tile block group relative" style={{borderBottom: '3px solid ' + (TYPE_META[mi.media_type]?.color || '#666')}}>
                              {mi.cover_image_url ? (
                                <img src={mi.cover_image_url} alt={mi.title} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                                  <span className="text-3xl">{typeEmoji}</span>
                                  <div className="text-xs text-white/70 font-medium line-clamp-3">{mi.title}</div>
                                </div>
                              )}
                              <div className="absolute inset-0 pointer-events-none"
                                   style={{background:'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)'}}>
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <div className="text-white text-xs font-semibold truncate">{mi.title}</div>
                                </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(cl.id, item.id); }}
                                className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-red-400 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 z-10">
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <ListFormModal open={showListForm} onClose={() => { setShowListForm(false); setEditingList(null); }} onSave={handleSaveList}
        initial={editingList || undefined} />
      {addMediaListId && (
        <AddMediaModal open={true} onClose={() => setAddMediaListId(null)} userId={user.id} listId={addMediaListId}
          onAdded={(item) => handleItemAdded(addMediaListId, item)} />
      )}
    </div>
  );
};

export default ListsPage;
