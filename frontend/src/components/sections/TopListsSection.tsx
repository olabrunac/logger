import { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2, GripVertical, Search } from 'lucide-react';
import api, { getUserFavorites } from '../../services/api';
import type { User, TopListItem, MediaItem } from '../../types';

const TYPE_CONFIG: Record<string, { emoji: string; color: string; label: string; slug: string }> = {
  movie: { emoji: '🎬', color: '#fbbf24', label: 'Filmes', slug: 'movies' },
  series: { emoji: '📺', color: '#ef4444', label: 'Séries', slug: 'tvshows' },
  game: { emoji: '🎮', color: '#60a5fa', label: 'Jogos', slug: 'games' },
  book: { emoji: '📚', color: '#4ade80', label: 'Livros', slug: 'books' },
};

interface TopListsSectionProps {
  profileUser: User;
  currentUser: User;
  accentColor: string;
}

const TopListsSection = ({ profileUser, currentUser }: TopListsSectionProps) => {
  const [topLists, setTopLists] = useState<Record<string, TopListItem[]>>({});
  const [draftItems, setDraftItems] = useState<Record<string, { id?: number; media_item_id: number; position: number; media_item?: MediaItem }[]>>({});
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, MediaItem[]>>({});
  const [searchLoading, setSearchLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetchTopLists();
  }, [profileUser.id]);

  const fetchTopLists = async () => {
    try {
      const res = await api.get(`/users/${profileUser.id}/top-list`);
      const grouped = res.data.reduce((acc: Record<string, TopListItem[]>, item: TopListItem) => {
        const type = item.media_item?.media_type || 'movie';
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      }, {});
      setTopLists(grouped);
    } catch (err) {
      console.error('Failed to fetch top lists', err);
    } finally {
      setLoading(false);
    }
  };

  const searchMedia = useCallback(async (type: string, query: string) => {
    if (!query.trim()) {
      setSearchResults(prev => ({ ...prev, [type]: [] }));
      return;
    }

    setSearchLoading(prev => ({ ...prev, [type]: true }));
    try {
      const res = await getUserFavorites(profileUser.id, type);
      // Filter results by query locally since backend returns all favorites
      const filtered = (res.data || []).filter((m: MediaItem) =>
        m.title.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(prev => ({ ...prev, [type]: filtered }));
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults(prev => ({ ...prev, [type]: [] }));
    } finally {
      setSearchLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [profileUser.id]);

  const handleSearchChange = (type: string, query: string) => {
    setSearchQuery(prev => ({ ...prev, [type]: query }));
    if (debounceRefs.current[type]) clearTimeout(debounceRefs.current[type]);
    debounceRefs.current[type] = setTimeout(() => searchMedia(type, query), 300);
  };

  const startEditing = (type: string) => {
    setIsEditing(prev => ({ ...prev, [type]: true }));
    setDraftItems(prev => ({ ...prev, [type]: (topLists[type] || []).map((i, idx) => ({ ...i, position: idx + 1 })) }));
    setSearchResults(prev => ({ ...prev, [type]: [] }));
    setSearchQuery(prev => ({ ...prev, [type]: '' }));
  };

  const cancelEditing = (type: string) => {
    setIsEditing(prev => ({ ...prev, [type]: false }));
    setDraftItems(_prev => { const n = { ...draftItems }; delete n[type]; return n; });
    setSearchResults(prev => ({ ...prev, [type]: [] }));
    setSearchQuery(prev => ({ ...prev, [type]: '' }));
  };

  const saveList = async (type: string) => {
    try {
      const items = draftItems[type] || [];
      const existingItems = topLists[type] || [];
      const currentIds = existingItems.map(i => i.id).filter(Boolean);
      const newIds = items.map(i => i.id).filter(Boolean);
      const deletedIds = currentIds.filter(id => !newIds.includes(id));

      // Delete removed items
      for (const id of deletedIds) {
        await api.delete(`/users/${profileUser.id}/top-list/${id}`);
      }

      // Create new items and update existing
      for (const item of items) {
        if (item.id) {
          // Update existing
          await api.put(`/users/${profileUser.id}/top-list/${item.id}`, { position: item.position });
        } else {
          // Create new
          await api.post(`/users/${profileUser.id}/top-list`, { media_item_id: item.media_item_id, position: item.position });
        }
      }

      setIsEditing(prev => ({ ...prev, [type]: false }));
      fetchTopLists();
    } catch (err) {
      console.error('Failed to save top list', err);
      alert('Erro ao salvar lista');
    }
  };

  const addItem = (type: string, mediaId: number) => {
    if (draftItems[type]?.length >= 5) return alert('Máximo de 5 itens');
    if (draftItems[type]?.some((i: any) => i.media_item_id === mediaId)) return alert('Já está na lista');
    const media = searchResults[type]?.find(m => m.id === mediaId);
    setDraftItems(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { media_item_id: mediaId, position: (prev[type]?.length || 0) + 1, media_item: media }]
    }));
    setSearchQuery(prev => ({ ...prev, [type]: '' }));
    setSearchResults(prev => ({ ...prev, [type]: [] }));
  };

  const removeItem = (type: string, index: number) => {
    setDraftItems(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 })) || []
    }));
  };

  const moveItem = (type: string, fromIndex: number, toIndex: number) => {
    setDraftItems(prev => {
      const items = [...(prev[type] || [])];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...prev, [type]: items.map((item, i) => ({ ...item, position: i + 1 })) };
    });
  };

  const types = ['movie', 'series', 'game', 'book'];

  if (loading) return <div className="mdf-card p-8 text-center text-white/50">Carregando Top 5...</div>;

  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Top 5 por Mídia</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {types.map(type => {
          const config = TYPE_CONFIG[type];
          const items = topLists[type] || [];
          const draft = isEditing[type] ? (draftItems[type] || []) : items;
          const results = searchResults[type] || [];
          const query = searchQuery[type] || '';
          const isLoading = searchLoading[type] || false;
          const isOwn = profileUser.id === currentUser.id;

          return (
            <div key={type} className="mdf-card p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{config.emoji}</span>
                  <span className="font-display font-bold text-lg" style={{ color: config.color }}>{config.label}</span>
                </div>
                {isOwn && (
                  <button
                    onClick={isEditing[type] ? () => saveList(type) : () => startEditing(type)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      isEditing[type]
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {isEditing[type] ? 'Salvar' : 'Editar'}
                  </button>
                )}
              </div>

              <ul className="flex-1 space-y-2 min-h-[180px]">
                {draft.length > 0 ? (
                  draft.map((item, index) => {
                    const media = item.media_item || results.find((m: MediaItem) => m.id === item.media_item_id);
                    return (
                      <li
                        key={item.id || index}
                        className="flex items-center gap-3 p-2 bg-white/5 rounded-lg group relative"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); moveItem(type, Number(e.currentTarget.dataset.from), index); }}
                        data-from={index}
                        draggable={isEditing[type]}
                        onDragStart={e => { e.currentTarget.dataset.from = String(index); }}
                      >
                        <span className="w-6 text-center text-white/50 font-mono text-xs">{index + 1}</span>
                        {isEditing[type] && (
                          <span className="w-6 h-6 flex items-center justify-center cursor-grab text-white/30 hover:text-white" onDragStart={e => e.stopPropagation()}>
                            <GripVertical size={14} />
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{media?.title || 'Carregando...'}</div>
                          <div className="text-[10px] text-white/40">Posição {index + 1}</div>
                        </div>
                        {isEditing[type] && (
                          <button
                            onClick={() => removeItem(type, index)}
                            className="p-1 text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="text-white/40 text-sm text-center py-4">Nenhum item na lista</li>
                )}
              </ul>

              {isEditing[type] && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar mídia para adicionar..."
                      value={query}
                      onChange={e => handleSearchChange(type, e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-green-500"
                    />
                    {isLoading && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30">Buscando...</div>}
                  </div>
                  {results.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {results
                        .filter((m: MediaItem) => m.id && !draftItems[type]?.some((i: any) => i.media_item_id === m.id))
                        .map((m: MediaItem) => (
                          <button
                            key={m.id}
                            onClick={() => addItem(type, m.id!)}
                            className="w-full flex items-center gap-2 p-1.5 bg-white/5 hover:bg-white/10 rounded text-left text-sm transition-colors"
                          >
                            {m.cover_image_url && (
                              <img src={m.cover_image_url} alt={m.title} className="w-8 h-12 object-cover rounded" />
                            )}
                            <span className="flex-1 truncate">{m.title}</span>
                            <span className="text-[10px] text-white/40">+ Adicionar</span>
                          </button>
                        ))}
                    </div>
                  )}
                  <button
                    onClick={() => cancelEditing(type)}
                    className="w-full px-3 py-1 text-xs font-bold rounded bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TopListsSection;