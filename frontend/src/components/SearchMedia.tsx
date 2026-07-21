import { useState } from 'react';
import api from '../services/api';
import type { MediaItem } from '../types/media';
import { MediaType } from '../types/media';

interface SearchMediaProps {
  onSelectMedia: (media: MediaItem) => void;
}

const SearchMedia = ({ onSelectMedia }: SearchMediaProps) => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.Movie);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mediaTypes = [MediaType.Movie, MediaType.Series, MediaType.Game];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsLoading(true);
    try {
      const response = await api.get('/media/search', {
        params: { q: query, media_type: mediaType },
      });
      setResults(response.data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Find a Movie, Series, or Game</h2>
      <div>
        {mediaTypes.map((type) => (
          <button
            key={type}
            onClick={() => setMediaType(type)}
            style={{ fontWeight: mediaType === type ? 'bold' : 'normal' }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search for a ${mediaType}...`}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      <div>
        {results.map((item) => (
          <div key={item.id || item.tmdb_id || item.igdb_id} onClick={() => onSelectMedia(item)} style={{ cursor: 'pointer', margin: '10px', border: '1px solid #ccc', padding: '10px' }}>
            <img src={item.cover_image_url} alt={item.title} width="50" style={{ marginRight: '10px' }} />
            <span>{item.title} ({item.release_date?.substring(0, 4)})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchMedia;
