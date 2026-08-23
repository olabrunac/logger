import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, User, X, Clock, TrendingUp } from 'lucide-react';
import type { MediaItem, MediaType } from '../types/media';
import type { User as UserType } from '../types';
import { globalSearch, getPopularSearches, trackSearch, type PopularSearchItem } from '../services/api';
import type { GlobalSearchFilters } from '../services/api';
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
const MAX_RECENT = 12;

const loadRecent = (): SearchMediaItem[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((s: unknown): s is SearchMediaItem => !!s && typeof s === 'object' && typeof (s as SearchMediaItem).title === 'string')
      : [];
  } catch { return []; }
};

const toMediaItem = (p: PopularSearchItem): SearchMediaItem => ({
  title: p.term,
  media_type: (p.media_type || 'movie') as MediaType,
  tmdb_id: p.tmdb_id ?? undefined,
  igdb_id: p.igdb_id ?? undefined,
  google_books_id: p.google_books_id ?? undefined,
  steam_appid: p.steam_appid ?? undefined,
  cover_image_url: p.cover_image_url ?? undefined,
});

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || '';
  const initialMediaType = (searchParams.get('media_type') as MediaType | 'all') || 'all';
  const [query, setQuery] = useState(initialQuery);
  const [mediaType, setMediaType] = useState<MediaType | 'all'>(initialMediaType);
  const [genre, setGenre] = useState(initialGenre);
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [isbn, setIsbn] = useState('');
  const [results, setResults] = useState<GlobalSearchResult>({ media: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [popular, setPopular] = useState<PopularSearchItem[]>([]);
  const [recent, setRecent] = useState<SearchMediaItem[]>(loadRecent);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchIdRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const g = searchParams.get('genre') || '';
    const mt = (searchParams.get('media_type') as MediaType | 'all') || 'all';
    const q = searchParams.get('q') || '';
    if (g !== genre) setGenre(g);
    if (mt !== mediaType) setMediaType(mt);
    if (q !== query) setQuery(q);
  }, [searchParams]);

  const rememberSearch = (item: SearchMediaItem) => {
    const title = item?.title?.trim();
    if (!title || title.length < 2) return;
    const entry: SearchMediaItem = {
      title,
      media_type: item.media_type,
      tmdb_id: item.tmdb_id,
      igdb_id: item.igdb_id,
      google_books_id: item.google_books_id,
      steam_appid: item.steam_appid,
      cover_image_url: item.cover_image_url,
    };
    setRecent(prev => {
      const next = [entry, ...prev.filter(s => s.title.toLowerCase() !== title.toLowerCase())].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    trackSearch(title, entry).catch(() => {});
  };

  const removeRecent = (title: string) => {
    setRecent(prev => {
      const next = prev.filter(s => s.title !== title);
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
    const isbnVal = isbn.trim();
    const genreVal = genre.trim();
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (genreVal) params.genre = genreVal;
    if (mediaType !== 'all') params.media_type = mediaType;
    setSearchParams(params, { replace: true });
    if (!q && !isbnVal && !author.trim() && !year.trim() && !genreVal) {
      setResults({ media: [], users: [] });
      setHasMore(false);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++searchIdRef.current;
      setIsLoading(true);
      try {
        const filters: GlobalSearchFilters = {};
        if (mediaType !== 'all') filters.media_type = mediaType;
        if (author.trim()) filters.author = author.trim();
        const yearNum = Number(year);
        if (year.trim() && !isNaN(yearNum)) filters.year = yearNum;
        if (isbnVal) filters.isbn = isbnVal;
        if (genreVal) filters.genre = genreVal;
        const { data } = await globalSearch(q, currentUserId, filters);
        if (requestId !== searchIdRef.current) return;
        const isGenreOnly = !!genreVal && !q;
        setResults({ media: data?.media || [], users: data?.users || [] });
        setHasMore(!isGenreOnly && (data?.media?.length || 0) >= PAGE_SIZE);
        setSearched(true);
      } catch (err) {
        if (requestId !== searchIdRef.current) return;
        console.error('Global search failed', err);
        setResults({ media: [], users: [] });
        setSearched(true);
      } finally {
        if (requestId === searchIdRef.current) setIsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, currentUserId, setSearchParams, mediaType, author, year, isbn, genre]);

  const PAGE_SIZE = 20;

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const filters: GlobalSearchFilters = {};
      if (mediaType !== 'all') filters.media_type = mediaType;
      if (author.trim()) filters.author = author.trim();
      const yearNum = Number(year);
      if (year.trim() && !isNaN(yearNum)) filters.year = yearNum;
      if (isbn.trim()) filters.isbn = isbn.trim();
      if (genre.trim()) filters.genre = genre.trim();
      const { data } = await globalSearch(query.trim(), currentUserId, filters, results.media.length);
      if (data?.media) {
        setResults(prev => ({ ...prev, media: [...prev.media, ...data.media] }));
        setHasMore(data.media.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch { setHasMore(false); }
    setLoadingMore(false);
  }, [query, currentUserId, mediaType, author, year, isbn, genre, results.media.length, loadingMore, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMore(); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, fetchMore]);

  const hasResults = results.media.length > 0 || results.users.length > 0;
  const noResults = searched && !isLoading && (query.trim() || isbn.trim() || author.trim() || year.trim() || genre.trim()) && !hasResults;

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

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {(['all', 'movie', 'series', 'game', 'book'] as const).map((t) => {
            const active = mediaType === t;
            const meta = t === 'all' ? null : TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => setMediaType(t)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: active ? (meta?.color || 'var(--accent)') : 'rgba(255,255,255,0.05)',
                  color: active ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {t === 'all' ? 'Todos' : meta.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {(mediaType === 'all' || mediaType === 'book') && (
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Autor..."
              className="flex-1 min-w-[140px] bg-white/5 text-white placeholder-white/30 text-sm outline-none px-3 py-1.5 rounded-lg"
            />
          )}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Ano..."
            min="1800"
            max="2100"
            className="w-24 bg-white/5 text-white placeholder-white/30 text-sm outline-none px-3 py-1.5 rounded-lg"
          />
          {(mediaType === 'all' || mediaType === 'book') && (
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBN..."
              className="w-36 bg-white/5 text-white placeholder-white/30 text-sm outline-none px-3 py-1.5 rounded-lg"
            />
          )}
        </div>
      </div>

      {genre.trim() && (
        <div className="flex items-center gap-2 mt-3 mb-4">
          <span className="text-xs text-white/40">Gênero:</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--accent)', color: '#000' }}>
            {genre.trim()}
          </span>
          <button onClick={() => setGenre('')} className="p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {!query.trim() && !isbn.trim() && !author.trim() && !year.trim() && !genre.trim() && (
        <div className="space-y-6">
          <div className="mdf-card p-8 text-center text-white/40 text-sm">
            Digite para buscar mídias (filmes, séries, jogos, livros) ou perfis de usuários.
            <br />
            Use <span className="text-white/70">@</span> no início para buscar apenas perfis. Também dá para buscar só por <span className="text-white/70">autor</span>, <span className="text-white/70">ano</span> ou <span className="text-white/70">ISBN</span> nos campos abaixo.
          </div>

          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                  <Clock size={12} /> Buscas recentes
                </h3>
                <button onClick={clearRecent} className="text-xs text-white/40 hover:text-white transition-colors">Limpar</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {recent.map(item => (
                  <div key={`${item.title}-${item.media_type}`} className="relative">
                    <Link to={getMediaUrl(item)} className="block w-24 group">
                      <div className="relative w-24 overflow-hidden rounded-lg" style={{ aspectRatio: '3/4', background: (TYPE_META[item.media_type]?.color || '#ff6b35') + '22' }}>
                        {item.cover_image_url ? (
                          <img src={imageUrl(item.cover_image_url) || ''} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">{TYPE_META[item.media_type]?.emoji || '🎬'}</div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-white/70 truncate group-hover:text-white transition-colors">{item.title}</div>
                    </Link>
                    <button onClick={() => removeRecent(item.title)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white/60 hover:text-white flex items-center justify-center transition-colors">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {popular.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                <TrendingUp size={12} /> Buscas populares
              </h3>
              <div className="flex flex-wrap gap-3">
                {popular.map(p => {
                  const item = toMediaItem(p);
                  return (
                    <Link key={item.title} to={getMediaUrl(item)} className="block w-24 group">
                      <div className="relative w-24 overflow-hidden rounded-lg" style={{ aspectRatio: '3/4', background: (TYPE_META[item.media_type]?.color || '#ff6b35') + '22' }}>
                        {item.cover_image_url ? (
                          <img src={imageUrl(item.cover_image_url) || ''} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">{TYPE_META[item.media_type]?.emoji || '🎬'}</div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-white/70 truncate group-hover:text-white transition-colors">{item.title}</div>
                    </Link>
                  );
                })}
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
                  onClick={() => rememberSearch(item)}
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
                    {item.authors && item.authors.length > 0 && (
                      <div className="text-xs text-white/40 truncate">{item.authors.join(', ')}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {hasMore && <div ref={sentinelRef} className="h-4" />}
          {loadingMore && <p className="text-center text-white/40 text-sm py-4">Carregando mais...</p>}
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
