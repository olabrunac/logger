import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, User, X, Clock, TrendingUp } from 'lucide-react';
import type { MediaItem } from '../types/media';
import type { User as UserType } from '../types';
import { globalSearch, getPopularSearches, trackSearch } from '../services/api';
import { getMediaUrl, imageUrl } from '../utils';
import { TYPE_META } from '../constants/designSystem';

interface SearchMediaItem extends MediaItem {
  id?: number;
  has_log?: boolean;
}

interface GlobalSearchResult {
  media: SearchMediaItem[];
  users: UserType[];
}

const RECENT_KEY = 'recent_searches';
const MAX_RECENT = 8;

const loadRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s: unknown): s is string => typeof s === 'string') : [];
  } catch { return []; }
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GlobalSearchResult>({ media: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [popular, setPopular] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.id as number | undefined;
    } catch { return undefined; }
  })();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    getPopularSearches().then(r => setPopular(r.data || [])).catch(() => {});
  }, []);

  const rememberSearch = (q: string) => {
    const term = q.trim();
    if (term.length < 2) return;
    setRecent(prev => {
      const next = [term, ...prev.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    trackSearch(term).catch(() => {});
  };

  const removeRecent = (term: string) => {
    setRecent(prev => {
      const next = prev.filter(s => s !== term);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q) {
      setSearchParams({ q }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    if (!q) {
      setResults({ media: [], users: [] });
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data } = await globalSearch(q, currentUserId);
        setResults({ media: data?.media || [], users: data?.users || [] });
        setSearched(true);
        rememberSearch(q);
      } catch (err) {
        console.error('Global search failed', err);
        setResults({ media: [], users: [] });
        setSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, currentUserId, setSearchParams]);

  const hasResults = results.media.length > 0 || results.users.length > 0;
  const noResults = searched && !isLoading && query.trim() && !hasResults;

  return (
    <div className="mx-auto" style={{ maxWidth: '900px' }}>
      <h1 className="font-display text-2xl font-black tracking-tight mb-4">Buscar</h1>

      <div className="mdf-card p-4 mb-6">
        <div className="flex items-center gap-3">
          <Search size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mídias ou @usuários"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
          />
          {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin flex-shrink-0" />}
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {!query.trim() && (
        <div className="space-y-6">
          <div className="mdf-card p-8 text-center text-white/40 text-sm">
            Digite para buscar mídias (filmes, séries, jogos, livros) ou perfis de usuários.
            <br />
            Use <span className="text-white/70">@</span> no início para buscar apenas perfis, ou
            <span className="text-white/70"> #filme</span>, <span className="text-white/70">#serie</span>, <span className="text-white/70">#jogo</span> ou <span className="text-white/70">#livro</span> para filtrar por tipo.
          </div>

          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                  <Clock size={12} /> Buscas recentes
                </h3>
                <button onClick={clearRecent} className="text-xs text-white/40 hover:text-white transition-colors">Limpar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map(term => (
                  <button key={term} onClick={() => setQuery(term)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white/5 text-white/70 hover:bg-white/10 transition-colors group">
                    {term}
                    <X size={12} onClick={(e) => { e.stopPropagation(); removeRecent(term); }}
                      className="text-white/40 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {popular.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                <TrendingUp size={12} /> Buscas populares
              </h3>
              <div className="flex flex-wrap gap-2">
                {popular.map(term => (
                  <button key={term} onClick={() => setQuery(term)}
                    className="px-3 py-1.5 rounded-full text-sm bg-white/5 text-white/70 hover:bg-white/10 transition-colors">
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {results.media.length > 0 && (
        <div className="mb-8">
          <h3 className="px-1 mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Mídias</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {results.media.map((item) => {
              const meta = TYPE_META[item.media_type] || TYPE_META.game;
              return (
                <Link
                  key={item.id || item.tmdb_id || item.igdb_id || item.google_books_id || item.title}
                  to={getMediaUrl(item)}
                  className="mdf-card overflow-hidden hover:bg-white/5 transition-colors group"
                >
                  <div className="relative w-full" style={{ aspectRatio: '3/4', background: meta.color + '22' }}>
                    {item.cover_image_url ? (
                      <img src={imageUrl(item.cover_image_url)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">{meta.emoji}</div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(10,12,16,0.8)', color: meta.color }}>
                      {meta.label}
                    </span>
                    {item.has_log && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--mdf-green)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    <div className="text-xs text-white/40">
                      {meta.singular}
                      {item.release_date && ` · ${new Date(item.release_date).getFullYear()}`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {results.users.length > 0 && (
        <div className="mb-8">
          <h3 className="px-1 mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Perfis</h3>
          <div className="mdf-card p-2 space-y-1">
            {results.users.map((u) => (
              <Link
                key={u.id}
                to={`/profile/${u.username}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--border)' }}>
                  {imageUrl(u.avatar_url) ? (
                    <img src={imageUrl(u.avatar_url)} alt={u.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--accent)', color: '#000' }}>
                      <User size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{u.display_name || u.username}</div>
                  <div className="text-xs text-white/40">
                    @{u.username}
                    {(u.followers_count ?? 0) > 0 && ` · ${u.followers_count} seguidores`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {noResults && (
        <div className="mdf-card p-8 text-center text-white/40 text-sm">
          Nenhum resultado para "{query.trim()}"
        </div>
      )}
    </div>
  );
};

export default SearchPage;
