import { Link } from 'react-router-dom';
import type { LogEntry } from '../../types';
import { STATUS_COLORS, STATUS_ICONS, TYPE_COLORS, TYPE_EMOJI, getStars } from '../../constants/designSystem';
import { getLogUrl } from '../../utils';

interface FavoritesSectionProps {
  logs: LogEntry[];
  accentColor: string;
  mediaType?: string;
}

const FavoritesSection = ({ logs, accentColor: _accentColor, mediaType }: FavoritesSectionProps) => {
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
          <Link key={log.id} to={getLogUrl(log.media_item)} className="poster-tile block group" style={{borderBottom: '5px solid ' + (TYPE_COLORS[log.media_item.media_type] || '#666')}}>
            {log.media_item.cover_image_url ? (
              <img src={log.media_item.cover_image_url} alt={log.media_item.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
                <span className="text-3xl">{TYPE_EMOJI[log.media_item.media_type] || '📄'}</span>
                <div className="text-xs text-white/70 font-medium line-clamp-3">{log.media_item.title}</div>
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3) 50%, transparent)' }}>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white text-xs font-semibold truncate">{log.media_item.title}</div>
                {log.rating && log.rating > 0 && (
                  <div className="mt-1 flex items-center gap-0.5">
                    {getStars(log.rating).map((star, i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                        fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                        stroke="var(--mdf-yellow)" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--mdf-pink)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              {log.status && !log.is_favorite && (
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: STATUS_COLORS[log.status] || 'rgba(100,100,100,0.85)' }}>
                  {STATUS_ICONS[log.status] || log.status[0].toUpperCase()}
                </span>
              )}
              {log.media_item.media_type === 'game' && log.unlocked_achievements != null && log.total_achievements != null && log.total_achievements > 0 && (
                <span className="h-6 px-1.5 flex items-center justify-center text-[9px] font-bold backdrop-blur-sm rounded-full" style={{ background: log.unlocked_achievements === log.total_achievements ? 'rgba(250,204,21,0.85)' : 'rgba(0,0,0,0.7)', color: log.unlocked_achievements === log.total_achievements ? '#000' : '#fff' }}>
                  {log.unlocked_achievements === log.total_achievements ? '100%' : `${log.unlocked_achievements}/${log.total_achievements}`}
                </span>
              )}
            </div>
            {log.platform && (
              <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                {log.platform}
              </div>
            )}
            {(log.relog_count ?? 0) > 0 ? (
              <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                {(log.relog_count ?? 0) + 1}x
              </div>
            ) : log.media_item.media_type === 'series' && log.watched_episodes != null && log.total_episodes != null && log.total_episodes > 0 ? (
              <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                {log.watched_episodes}/{log.total_episodes}
              </div>
            ) : log.media_item.media_type === 'game' && log.hours_spent != null && log.hours_spent > 0 ? (
              <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                {log.hours_spent}h
              </div>
            ) : log.media_item.media_type === 'book' && log.hours_spent != null && log.hours_spent > 0 ? (
              <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                {log.hours_spent}h
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
};

export default FavoritesSection;
