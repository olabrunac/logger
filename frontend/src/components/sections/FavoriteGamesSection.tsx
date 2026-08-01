import type { LogEntry } from '../../types';
import { TYPE_EMOJI } from '../../constants/designSystem';
import YgpCard from './YgpCard';

interface FavoritesSectionProps {
  logs: LogEntry[];
  accentColor: string;
  mediaType?: string;
}

const FavoritesSection = ({ logs, accentColor, mediaType }: FavoritesSectionProps) => {
  const favorites = logs
    .filter((l) => l.is_favorite && (!mediaType || l.media_item.media_type === mediaType))
    .slice(0, 8);

  if (favorites.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-2xl font-bold flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--mdf-pink)' }}>&#9829;</span>
        Favoritos {mediaType && `· ${TYPE_EMOJI[mediaType] || ''}`}
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
        {favorites.map((log) => (
          <YgpCard key={log.id} log={log} accentColor={accentColor} />
        ))}
      </div>
    </section>
  );
};

export default FavoritesSection;
