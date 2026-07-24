import { useEffect, useState } from 'react';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [favorites, setFavorites] = useState<Record<string, MediaItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingFav, setLoadingFav] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTopLists();
  }, [profileUser.id]);

  const fetchTopLists = async () => {
    try {
      const res = await api.get(`/media/users/${profileUser.id}/top-list`);
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

  const loadFavorites = async (type: string) => {
    if (favorites[type]?.length) return;
    setLoadingFav(prev => ({ ...prev, [type]: true }));
    try {
      console.log('Loading favorites for:', type, 'user:', profileUser.id);
      const res = await getUserFavorites(profileUser.id, type);
      console.log('Favorites response:', res.data);
      setFavorites(prev => ({ ...prev, [type]: res.data || [] }));
    } catch (err) {
      console.error('Failed to load favorites', err);
    } finally {
      setLoadingFav(prev => ({ ...prev, [type]: false }));
    }
  };

  const startEditing = (type: string) => {
    setIsEditing(prev => ({ ...prev, [type]: true }));
    setDraftItems(prev => ({ ...prev, [type]: (topLists[type] || []).map((i, idx) => ({ ...i, position: idx + 1 })) }));
    loadFavorites(type);
  };

  const cancelEditing = (type: string) => {
    setIsEditing(prev => ({ ...prev, [type]: false }));
    setDraftItems(_prev => { const n = { ...draftItems }; delete n[type]; return n; });
  };

  const saveList = async (type: string) => {
    try {
      const items = draftItems[type] || [];
      const existingItems = topLists[type] || [];
      const currentIds = existingItems.map(i => i.id).filter(Boolean);
      const newIds = items.map(i => i.id).filter(Boolean);
      const deletedIds = currentIds.filter(id => !newIds.includes(id));

      for (const id of deletedIds) {
        await api.delete(`/media/users/${profileUser.id}/top-list/${id}`);
      }

      for (const item of items) {
        if (item.id) {
          await api.put(`/media/users/${profileUser.id}/top-list/${item.id}`, { position: item.position });
        } else {
          await api.post(`/media/users/${profileUser.id}/top-list`, { media_item_id: item.media_item_id, position: item.position });
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
    const media = favorites[type]?.find(m => m.id === mediaId);
    setDraftItems(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { media_item_id: mediaId, position: (prev[type]?.length || 0) + 1, media_item: media }]
    }));
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
          const favs = favorites[type] || [];
          const favLoading = loadingFav[type] || false;
          const isOwn = profileUser.id === currentUser.id;

          return (
            <div key={type} className="mdf-card p-4 flex flex-col h-full relative">
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

              <div className="flex-1 flex gap-2 min-h-[160px]">
                {draft.length > 0 ? (
                  draft.map((item, index) => {
                    const media = item.media_item || favs.find((m: MediaItem) => m.id === item.media_item_id);
                    return (
                      <div
                        key={item.id || index}
                        className="flex flex-col items-center gap-1 flex-1 min-w-0 relative group"
                      >
                        {isEditing[type] && (
                          <div className="absolute -top-1 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {index > 0 && (
                              <button onClick={() => moveItem(type, index, index - 1)} className="p-0.5 bg-black/60 rounded text-white/60 hover:text-white">
                                <ChevronUp size={12} />
                              </button>
                            )}
                            {index < draft.length - 1 && (
                              <button onClick={() => moveItem(type, index, index + 1)} className="p-0.5 bg-black/60 rounded text-white/60 hover:text-white">
                                <ChevronDown size={12} />
                              </button>
                            )}
                            <button onClick={() => removeItem(type, index)} className="p-0.5 bg-black/60 rounded text-white/60 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        <div className="w-full aspect-[2/3] relative rounded-md overflow-hidden bg-white/5">
                          {media?.cover_image_url ? (
                            <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">?</div>
                          )}
                          <div className="absolute top-1 left-1 bg-black/70 text-white font-mono text-xs font-bold w-5 h-5 flex items-center justify-center rounded">
                            {index + 1}
                          </div>
                        </div>
                        <div className="w-full text-center">
                          <div className="font-medium truncate text-xs">{media?.title || '...'}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-white/40 text-sm text-center py-4 w-full">Nenhum item na lista</div>
                )}
              </div>

              {isEditing[type] && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  {favLoading ? (
                    <div className="text-center text-white/50 py-4">Carregando favoritos...</div>
                  ) : favs.length === 0 ? (
                    <div className="text-center text-white/50 py-4">Nenhum favorito desta mídia ainda</div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {favs
                        .map((m: MediaItem) => {
                          const alreadyAdded = draftItems[type]?.some((i: any) => i.media_item_id === m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => !alreadyAdded && addItem(type, m.id!)}
                              disabled={alreadyAdded}
                              className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors group ${alreadyAdded ? 'bg-white/[0.02] opacity-40 cursor-default' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                              {m.cover_image_url && (
                                <img src={m.cover_image_url} alt={m.title} className="w-10 h-15 object-cover rounded flex-shrink-0" />
                              )}
                              <span className="flex-1 truncate text-sm">{m.title}</span>
                              {alreadyAdded ? (
                                <span className="text-xs text-white/30">Já na lista</span>
                              ) : (
                                <span className="text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">+ Adicionar</span>
                              )}
                            </button>
                          );
                        })}
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