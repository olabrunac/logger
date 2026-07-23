import { useEffect, useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import api from '../../services/api';
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
  const [mediaOptions, setMediaOptions] = useState<Record<string, MediaItem[]>>({});
  const [loading, setLoading] = useState(true);

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

  const startEditing = (type: string) => {
    setIsEditing(prev => ({ ...prev, [type]: true }));
    setDraftItems(prev => ({ ...prev, [type]: (topLists[type] || []).map((i, idx) => ({ ...i, position: idx + 1 })) }));
    if (!mediaOptions[type]?.length) {
      api.get(`/media/search?q=&media_type=${type}&limit=100`)
        .then(res => setMediaOptions(prev => ({ ...prev, [type]: res.data || [] })))
        .catch(() => {});
    }
  };

  const cancelEditing = (type: string) => {
    setIsEditing(prev => ({ ...prev, [type]: false }));
    setDraftItems(_prev => { const n = { ...draftItems }; delete n[type]; return n; });
  };

  const saveList = async (type: string) => {
    try {
      const items = draftItems[type] || [];
      await api.put(`/users/${profileUser.id}/top-list/reorder`, items.map(i => ({ id: i.id, position: i.position })));
      setIsEditing(prev => ({ ...prev, [type]: false }));
      fetchTopLists();
    } catch (err) {
      console.error('Failed to save top list', err);
      alert('Erro ao salvar lista');
    }
  };

  const addItem = (type: string, mediaId: number) => {
    if (!mediaId) return;
    if (draftItems[type]?.length >= 5) return alert('Máximo de 5 itens');
    if (draftItems[type]?.some((i: any) => i.media_item_id === mediaId)) return alert('Já está na lista');
    setDraftItems(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { media_item_id: mediaId, position: (prev[type]?.length || 0) + 1 }]
    }));
  };

  const removeItem = (type: string, index: number) => {
    setDraftItems(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 })) || []
    }));
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
          const options = mediaOptions[type] || [];
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
                    const media = item.media_item || options.find((m: MediaItem) => m.id === item.media_item_id);
                    return (
                      <li key={item.id || index} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg group">
                        <span className="w-6 text-center text-white/50 font-mono text-xs">{index + 1}</span>
                        {isEditing[type] && (
                          <span className="w-6 h-6 flex items-center justify-center cursor-grab text-white/30 hover:text-white">
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
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                  <select
                    onChange={e => {
                      const mediaId = Number(e.target.value);
                      if (mediaId) {
                        addItem(type, mediaId);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="" disabled>Adicionar item...</option>
                    {options
                      .filter((m: MediaItem) => !draftItems[type]?.some((i: any) => i.media_item_id === m.id))
                      .map((m: MediaItem) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                  </select>
                  <button
                    onClick={() => cancelEditing(type)}
                    className="px-3 py-1 text-xs font-bold rounded bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
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