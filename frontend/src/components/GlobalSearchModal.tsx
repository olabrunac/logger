import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { MediaItem } from '../types/media';
import type { User as UserType } from '../types';
import { globalSearch } from '../services/api';
import { getLogUrl, imageUrl } from '../utils';
import { TYPE_META } from '../constants/designSystem';

interface GlobalSearchResult {
  media: Array<MediaItem & { id: number }>;
  users: UserType[];
}

const GlobalSearchModal = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult>({ media: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults({ media: [], users: [] });
      setSearched(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults({ media: [], users: [] });
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data } = await globalSearch(q);
        setResults({ media: data?.media || [], users: data?.users || [] });
        setSearched(true);
      } catch (err) {
        console.error('Global search failed', err);
        setResults({ media: [], users: [] });
        setSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleClose = () => setOpen(false);

  const goTo = (url: string) => {
    handleClose();
    navigate(url);
  };

  const hasResults = results.media.length > 0 || results.users.length > 0;
  const noResults = searched && !isLoading && query.trim() && !hasResults;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
        title="Buscar mídias e perfis"
      >
        <Search size={18} style={{ color: 'var(--accent)' }} />
        <span>Buscar</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 pt-[10vh]" onClick={handleClose}>
          <div className="mdf-card w-full max-w-2xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <Search size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar mídias ou perfis..."
                className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
                onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
              />
              {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin flex-shrink-0" />}
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!query.trim() && (
                <div className="p-8 text-center text-white/40 text-sm">
                  Digite para buscar mídias (filmes, séries, jogos, livros) e perfis de usuários.
                </div>
              )}

              {results.media.length > 0 && (
                <div className="p-4">
                  <h3 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Mídias</h3>
                  <div className="space-y-1">
                    {results.media.map((item) => (
                      <button
                        key={item.id || item.tmdb_id || item.igdb_id || item.google_books_id || item.title}
                        onClick={() => goTo(getLogUrl(item))}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <div
                          className="w-9 h-12 rounded overflow-hidden flex-shrink-0"
                          style={{ background: 'var(--bg-card)' }}
                        >
                          {item.cover_image_url ? (
                            <img src={imageUrl(item.cover_image_url)} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base">
                              {TYPE_META[item.media_type]?.emoji || '🎬'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{item.title}</div>
                          <div className="text-xs text-white/40">
                            {TYPE_META[item.media_type]?.singular || item.media_type}
                            {item.release_date && ` · ${new Date(item.release_date).getFullYear()}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.users.length > 0 && (
                <div className="p-4 pt-0">
                  <h3 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Perfis</h3>
                  <div className="space-y-1">
                    {results.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => goTo(`/profile/${u.username}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {imageUrl(u.avatar_url) ? (
                            <img src={imageUrl(u.avatar_url)} alt={u.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--accent)', color: '#000' }}>
                              <User size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {u.display_name || u.username}
                          </div>
                          <div className="text-xs text-white/40">
                            @{u.username}
                            {(u.followers_count ?? 0) > 0 && ` · ${u.followers_count} seguidores`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {noResults && (
                <div className="p-8 text-center text-white/40 text-sm">
                  Nenhum resultado para "{query.trim()}"
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default GlobalSearchModal;
