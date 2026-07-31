import { Link } from 'react-router-dom';
import type { LogEntry } from '../../types';
import { TYPE_META, STATUS_COLORS, STATUS_ICONS } from '../../constants/designSystem';
import { getLogUrl } from '../../utils';

interface YgpCardProps {
  log: LogEntry;
  accentColor?: string;
  showStatus?: boolean;
}

const YgpCard = ({ log, accentColor, showStatus = true }: YgpCardProps) => {
  const meta = TYPE_META[log.media_item.media_type];
  const color = meta?.color || accentColor || '#666';

  return (
    <Link
      to={getLogUrl(log.media_item)}
      className="group relative flex flex-col overflow-hidden rounded-lg transition-opacity hover:opacity-90"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `5px solid ${color}`, aspectRatio: '3/4' }}
    >
      {log.media_item.cover_image_url ? (
        <img
          src={log.media_item.cover_image_url}
          alt={log.media_item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
          <span className="text-3xl">{meta?.emoji || '📄'}</span>
          <div className="text-xs text-white/70 font-medium line-clamp-3">{log.media_item.title}</div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-2.5">
        {log.hours_spent != null && log.hours_spent > 0 && (
          <div className="flex h-5 items-center gap-1 rounded bg-black/50 px-1.5 text-[10px] text-white/70 tabular-nums backdrop-blur-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {log.hours_spent}h
          </div>
        )}
        {log.media_item.media_type === 'game' && log.unlocked_achievements != null && log.total_achievements != null && log.total_achievements > 0 && (
          <div
            className="flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] font-bold backdrop-blur-sm"
            style={{ background: 'rgba(111,255,111,0.15)', color: '#6FFF6F' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 2H3v2h1v4c0 3.31 2.69 6 6 6h.1c.72 1.7 2.08 3 3.9 3.5V20H11v2h6v-2h-2v-2.5c1.82-.5 3.18-1.8 3.9-3.5H18c3.31 0 6-2.69 6-6V4h1V2z"/>
            </svg>
            {log.unlocked_achievements === log.total_achievements ? '100%' : `${log.unlocked_achievements}/${log.total_achievements}`}
          </div>
        )}
        {(log.relog_count ?? 0) > 0 && (
          <div className="flex h-5 items-center gap-0.5 rounded bg-black/50 px-1.5 text-[10px] text-white/70 tabular-nums backdrop-blur-sm">
            {(log.relog_count ?? 0) + 1}x
          </div>
        )}
        {log.media_item.media_type === 'series' && log.watched_episodes != null && log.total_episodes != null && log.total_episodes > 0 && (
          <div className="flex h-5 items-center gap-0.5 rounded bg-black/50 px-1.5 text-[10px] text-white/70 tabular-nums backdrop-blur-sm">
            {Math.min(log.watched_episodes, log.total_episodes)}/{log.total_episodes}
          </div>
        )}
      </div>

      {showStatus && (
        <div className="absolute top-2 right-2">
          {log.is_favorite ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--mdf-pink)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
          ) : log.status ? (
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-lg"
              style={{ background: STATUS_COLORS[log.status] || 'rgba(100,100,100,0.85)' }}
            >
              {STATUS_ICONS[log.status] || log.status[0].toUpperCase()}
            </span>
          ) : null}
        </div>
      )}

      {log.rating != null && log.rating > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--mdf-yellow)" stroke="var(--mdf-yellow)" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-[10px] font-bold text-white">{log.rating}</span>
          </div>
        </div>
      )}
    </Link>
  );
};

export default YgpCard;
