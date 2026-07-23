import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import type { MediaItem, MediaType } from '../types/media';

interface SearchMediaProps {
  onSelectMedia: (media: MediaItem) => void;
  initialMediaType?: MediaType;
}

const SearchMedia = ({ onSelectMedia, initialMediaType }: SearchMediaProps) => {
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [isbn, setIsbn] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType || 'movie');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const mediaTypes: MediaType[] = ['movie', 'series', 'game', 'book'];
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() && !isbn.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      doSearch(query, isbn);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isbn, mediaType, author, year]);

  const doSearch = async (q: string, isbnVal: string) => {
    if (!q.trim() && !isbnVal.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { q: q || isbnVal, media_type: mediaType };
      if (author.trim()) params.author = author.trim();
      if (year.trim() && !isNaN(Number(year))) params.year = Number(year);
      if (isbnVal.trim()) params.isbn = isbnVal.trim();
      const response = await api.get('/media/search', { params });
      setResults(response.data || []);
    } catch (err) {
      console.error("Search failed", err);
      setError('Falha na busca. Tente novamente.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query, isbn);
  };

  const getMediaTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'movie':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 10h20"/><path d="M2 14h20"/><path d="M7 14H5"/><path d="M17 14h-2"/></svg>;
      case 'series':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h20"/><path d="M2 12h20"/><path d="M2 21h20"/><path d="M7 16h10"/><path d="M7 7h10"/><path d="M14 9v3"/><path d="M9 18v-9"/></svg>;
      case 'game':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
      case 'book':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>;
      default:
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
    }
  };

  const getMediaTypeLabel = (type: MediaType) => {
    switch (type) {
      case 'movie': return 'Filmes';
      case 'series': return 'Séries';
      case 'game': return 'Jogos';
      case 'book': return 'Livros';
      default: return type;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ margin: 0 }}>Buscar Mídia</h2>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {mediaTypes.map((type) => (
          <button
            key={type}
            onClick={() => {
              setMediaType(type);
              setResults([]);
              setError('');
              setIsbn('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              fontWeight: mediaType === type ? 600 : 500,
              color: mediaType === type ? 'var(--accent)' : 'var(--text)',
              background: mediaType === type ? 'var(--accent-bg)' : 'var(--bg-elevated)',
              border: `1px solid ${mediaType === type ? 'var(--accent-border)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={(e) => {
              if (mediaType !== type) {
                e.currentTarget.style.borderColor = 'var(--accent-border)';
                e.currentTarget.style.color = 'var(--accent)';
              }
            }}
            onMouseLeave={(e) => {
              if (mediaType !== type) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
          >
            {getMediaTypeIcon(type)}
            {getMediaTypeLabel(type)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Título do ${getMediaTypeLabel(mediaType).toLowerCase()}...`}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={isLoading || (!query.trim() && !isbn.trim())} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Buscar
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {mediaType === 'book' && (
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBN..."
              className="form-input"
              style={{ width: '160px' }}
            />
          )}
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={mediaType === 'book' ? 'Autor...' : mediaType === 'game' ? 'Desenvolvedora...' : 'Diretor...'}
            className="form-input"
            style={{ flex: 1, minWidth: '160px' }}
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Ano..."
            className="form-input"
            style={{ width: '100px' }}
            min="1900"
            max="2099"
          />
        </div>
      </form>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(248, 113, 113, 0.15)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map((item) => (
            <button
              key={item.id || item.tmdb_id || item.igdb_id}
              onClick={() => onSelectMedia(item)}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-border)';
                e.currentTarget.style.background = 'var(--accent-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <img
                src={item.cover_image_url}
                alt={item.title}
                width="80"
                height="120"
                style={{
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                  {item.title}
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent-border)',
                    }}>
                      {getMediaTypeLabel(item.media_type as MediaType)}
                    </span>
                  </span>
                  {item.release_date && (
                    <span>{new Date(item.release_date).getFullYear()}</span>
                  )}
                </div>
                {item.synopsis && (
                  <p style={{
                    margin: '0.5rem 0 0',
                    fontSize: '0.8125rem',
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.synopsis}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && query && !isLoading && !error && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          color: 'var(--text-muted)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: '1rem' }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <p>Nenhum resultado encontrado para "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default SearchMedia;