import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getUserWishlist, getUserCustomLists, createCustomList, updateCustomList, deleteCustomList, addCustomListItem, removeCustomListItem, resolveUserByUsername } from '../services/api';
import type { LogEntry, MediaType, CustomList, CustomListItem, User } from '../types';
import type { MediaItem } from '../types/media';
import { Gamepad2, Film, Tv, Book, Pencil, Trash2, Plus, ChevronDown, ChevronRight, X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { TYPE_META } from '../constants/designSystem';
import YgpCard from '../components/sections/YgpCard';
import { isInGameLibrary } from '../utils';

interface ListsPageProps {
  currentUser: User;
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
  { key: 'library', label: 'Biblioteca' },
  { key: 'dropped', label: 'Abandonados' },
];

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

const ListsPage = ({ currentUser }: ListsPageProps) => {
  const { username } = useParams<{ username: string }>();
  const [tab, setTab] = useState<MediaType | 'all'>('all');
  const [targetUser, setTargetUser] = useState<{ id: number; username: string }>(currentUser);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wishlist, setWishlist] = useState<(LogEntry & { media_item: MediaItem })[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [expandedLists, setExpandedLists] = useState<Record<number, boolean>>({});
  const [showListForm, setShowListForm] = useState(false);
  const [editingList, setEditingList] = useState<{ id: number; name: string; description: string } | null>(null);
  const [addMediaListId, setAddMediaListId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const fetchIdRef = useRef(0);

  const displayUsername = username || currentUser.username;
  const isOwnProfile = displayUsername === currentUser.username;

  useEffect(() => {
    if (username && username !== currentUser.username) {
      resolveUserByUsername(username)
        .then(setTargetUser)
        .catch(() => setTargetUser(currentUser));
    } else {
      setTargetUser(currentUser);
    }
  }, [username, currentUser]);

  const fetchLogs = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    try {
      const [logsRes, wishlistRes, customRes] = await Promise.all([
        api.get('/media/logs', { params: { user_id: targetUser.id, limit: 9999, light: true } }),
        getUserWishlist(targetUser.id),
        getUserCustomLists(targetUser.id),
      ]);
      if (requestId === fetchIdRef.current) {
        setLogs(logsRes.data || []);
        setWishlist(wishlistRes.data || []);
        setCustomLists(customRes.data || []);
      }
    } catch (err) { console.error('Failed to fetch lists data', err); }
  }, [targetUser.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const deleteWishlistItem = async (id: number) => {
    try {
      await api.delete(`/media/logs/${id}`);
      setWishlist(prev => prev.filter(l => l.id !== id));
    } catch (err) { console.error('Failed to delete wishlist item', err); }
  };

  const handleSaveList = async (name: string, description: string) => {
    try {
      if (editingList) {
        const res = await updateCustomList(targetUser.id, editingList.id, { name, description });
        setCustomLists(prev => prev.map(l => l.id === editingList.id ? res.data : l));
      } else {
        const res = await createCustomList(targetUser.id, { name, description });
        setCustomLists(prev => [res.data, ...prev]);
      }
    } catch (err) { console.error('Failed to save list', err); }
    setShowListForm(false);
    setEditingList(null);
  };

  const handleDeleteList = async (listId: number) => {
    try {
      await deleteCustomList(targetUser.id, listId);
      setCustomLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) { console.error('Failed to delete list', err); }
  };

  const handleRemoveItem = async (listId: number, itemId: number) => {
    try {
      await removeCustomListItem(targetUser.id, listId, itemId);
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

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredLogs = tab === 'all' ? logs : logs.filter(l => l.media_item.media_type === tab);

  const grouped = STATUS_GROUPS.map(g => ({
    ...g,
    items: filteredLogs
      .filter(l => g.key === 'library'
        ? (l.media_item?.media_type === 'game' ? isInGameLibrary(l) : l.status === 'library')
        : l.status === g.key)
      .sort((a, b) => (a.media_item?.title || '').localeCompare(b.media_item?.title || '', 'pt-BR', { sensitivity: 'base', numeric: true })),
  }));

  const filteredWishlist = (tab === 'all' ? wishlist : wishlist.filter(l => l.media_item.media_type === tab))
    .sort((a, b) => (a.media_item?.title || '').localeCompare(b.media_item?.title || '', 'pt-BR', { sensitivity: 'base', numeric: true }));

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

      {filteredWishlist.length === 0 && customLists.length === 0 && logs.length === 0 && (
        <div className="mdf-card p-10 text-center text-white/50">Nada aqui ainda.</div>
      )}

      {grouped.map(g => {
        const expanded = expandedSections[`group-${g.key}`] === true;
        return (
        <section key={g.key}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-xl font-bold">{g.label}</h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/40 uppercase tracking-[0.2em]">{g.items.length}</div>
              <button onClick={() => toggleSection(`group-${g.key}`)}
                className="flex items-center gap-1 p-0 text-xs font-semibold uppercase tracking-wider bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--accent)' }}>
                {expanded ? 'Ver menos' : 'Ver mais'}
                <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>
          {g.items.length === 0 ? (
            <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhum item nesta categoria.</div>
          ) : (
            <>
              <div className="hidden lg:grid grid-cols-11 gap-2">
                {(expanded ? g.items : g.items.slice(0, 33)).map((l) => (
                  <YgpCard key={l.id} log={l} />
                ))}
              </div>
              <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
                {(expanded ? g.items : g.items.slice(0, 20)).map((l) => (
                  <div key={l.id} className="w-[28%] shrink-0">
                    <YgpCard log={l} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        );
      })}

      {(() => {
        const wishlistExpanded = expandedSections['wishlist'] === true;
        return (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-xl font-bold">Lista de Desejos</h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/40 uppercase tracking-[0.2em]">{filteredWishlist.length}</div>
              <button onClick={() => toggleSection('wishlist')}
                className="flex items-center gap-1 p-0 text-xs font-semibold uppercase tracking-wider bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--accent)' }}>
                {wishlistExpanded ? 'Ver menos' : 'Ver mais'}
                <ChevronRight size={14} className={`transition-transform ${wishlistExpanded ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>
          {filteredWishlist.length === 0 ? (
            <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhum item na lista de desejos.</div>
          ) : (
            <>
              <div className="hidden lg:grid grid-cols-11 gap-2">
                {(wishlistExpanded ? filteredWishlist : filteredWishlist.slice(0, 33)).map((l) => (
                  <YgpCard key={l.id} log={l} actions={
                    isOwnProfile ? (
                    <>
                      <Link to={`/new-log?edit=${l.id}`} onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-colors" title="Editar">
                        <Pencil size={12} />
                      </Link>
                      <button onClick={(e) => { e.stopPropagation(); deleteWishlistItem(l.id); }}
                        className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-red-400 backdrop-blur-sm transition-colors" title="Remover">
                        <Trash2 size={12} />
                      </button>
                    </>
                    ) : undefined
                  } />
                ))}
              </div>
              <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
                {(wishlistExpanded ? filteredWishlist : filteredWishlist.slice(0, 20)).map((l) => (
                  <div key={l.id} className="w-[28%] shrink-0">
                    <YgpCard log={l} actions={
                      isOwnProfile ? (
                      <>
                        <Link to={`/new-log?edit=${l.id}`} onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-colors" title="Editar">
                          <Pencil size={12} />
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); deleteWishlistItem(l.id); }}
                          className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-red-400 backdrop-blur-sm transition-colors" title="Remover">
                          <Trash2 size={12} />
                        </button>
                      </>
                      ) : undefined
                    } />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        );
      })()}

      {/* Custom Lists */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Listas Personalizadas</h2>
          {isOwnProfile && (
            <button onClick={() => { setEditingList(null); setShowListForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-colors hover:opacity-90"
              style={{ background: 'var(--mdf-green)' }}>
              <Plus size={14} /> Nova Lista
            </button>
          )}
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
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-white/40">{filteredItems.length} itens</div>
                    <button onClick={(e) => { e.stopPropagation(); toggleSection(`list-${cl.id}`); }}
                      className="flex items-center gap-1 p-0 text-xs font-semibold uppercase tracking-wider bg-transparent border-none cursor-pointer"
                      style={{ color: 'var(--accent)' }}>
                      {expandedSections[`list-${cl.id}`] === true ? 'Ver menos' : 'Ver mais'}
                      <ChevronRight size={14} className={`transition-transform ${expandedSections[`list-${cl.id}`] === true ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                  {isOwnProfile && (
                    <button onClick={(e) => { e.stopPropagation(); setAddMediaListId(cl.id); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <Plus size={16} />
                    </button>
                  )}
                  {isOwnProfile && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingList({ id: cl.id, name: cl.name, description: cl.description || '' }); setShowListForm(true); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <Pencil size={14} />
                    </button>
                  )}
                  {isOwnProfile && (
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta lista?')) handleDeleteList(cl.id); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    {filteredItems.length === 0 ? (
                      <div className="text-center text-white/30 text-xs py-4">Nenhum item ainda</div>
                    ) : (
                      <>
                        <div className="hidden lg:grid grid-cols-11 gap-2">
                          {(expandedSections[`list-${cl.id}`] === true ? filteredItems : filteredItems.slice(0, 33)).map((item) => {
                          if (!item.media_item) return null;
                          return (
                            <YgpCard key={item.id} log={{ id: item.id, media_item: item.media_item }} actions={
                              isOwnProfile ? (
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(cl.id, item.id); }}
                                className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-red-400 backdrop-blur-sm transition-colors" title="Remover da lista">
                                <X size={12} />
                              </button>
                              ) : undefined
                            } />
                          );
                        })}
                        </div>
                        <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
                          {(expandedSections[`list-${cl.id}`] === true ? filteredItems : filteredItems.slice(0, 20)).map((item) => {
                          if (!item.media_item) return null;
                          return (
                            <div key={item.id} className="w-[28%] shrink-0">
                              <YgpCard log={{ id: item.id, media_item: item.media_item }} actions={
                                isOwnProfile ? (
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(cl.id, item.id); }}
                                  className="w-6 h-6 rounded flex items-center justify-center bg-black/70 text-white/70 hover:text-red-400 backdrop-blur-sm transition-colors" title="Remover da lista">
                                  <X size={12} />
                                </button>
                                ) : undefined
                              } />
                            </div>
                          );
                        })}
                        </div>
                      </>
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
        <AddMediaModal open={true} onClose={() => setAddMediaListId(null)} userId={targetUser.id} listId={addMediaListId}
          onAdded={(item) => handleItemAdded(addMediaListId, item)} />
      )}
    </div>
  );
};

export default ListsPage;
