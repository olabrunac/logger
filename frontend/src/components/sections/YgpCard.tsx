import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { LogEntry, MediaItem } from '../../types';
import { TYPE_META, STATUS_COLORS } from '../../constants/designSystem';
import Stars from '../Stars';
import { getLogUrl, formatHours } from '../../utils';
import StatusIcon from '../StatusIcon';

interface YgpCardProps {
  log: Partial<LogEntry> & { id: number; media_item: MediaItem };
  accentColor?: string;
  showStatus?: boolean;
  actions?: ReactNode;
  rank?: string;
  className?: string;
  style?: CSSProperties;
}

const YgpCard = ({ log, accentColor, showStatus = true, actions, rank, className, style }: YgpCardProps) => {
  const meta = TYPE_META[log.media_item.media_type];
  const color = meta?.color || accentColor || '#666';
  const isGame = log.media_item.media_type === 'game';
  const isSeries = log.media_item.media_type === 'series';
  const hasHours = log.hours_spent != null && log.hours_spent > 0;
  const achievements =
    isGame && log.unlocked_achievements != null && log.total_achievements != null && log.total_achievements > 0
      ? { unlocked: log.unlocked_achievements, total: log.total_achievements }
      : null;
  const episodes =
    isSeries && log.watched_episodes != null && log.total_episodes != null && log.total_episodes > 0
      ? { watched: Math.min(log.watched_episodes, log.total_episodes), total: log.total_episodes }
      : null;
  const isPlatinated = isGame && (log.status === 'platinated' || (achievements != null && achievements.unlocked === achievements.total));

  return (
    <div className="flex min-w-0 w-full flex-col gap-1">
      {rank && (
        <div className="text-center text-[10px] font-bold tracking-wide leading-tight truncate" style={{ color: 'var(--accent)' }}>
          {rank}
        </div>
      )}

      <Link
        to={getLogUrl(log.media_item)}
        className={`group relative flex flex-col overflow-hidden rounded-lg transition-opacity hover:opacity-90 ${className ?? ''}`}
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `3px solid ${color}`, aspectRatio: '3/4', ...style }}
      >
      {log.media_item.cover_image_url ? (
        <img
          src={log.media_item.cover_image_url}
          alt={log.media_item.title}
          className="w-full h-full object-cover transition-transform duration-300 pointer-fine:group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-3 text-center">
          <span className="text-3xl">{meta?.emoji || '📄'}</span>
          <div className="text-xs text-white/70 font-medium line-clamp-3">{log.media_item.title}</div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {(log.is_favorite || isPlatinated) && (
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {log.is_favorite && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--mdf-pink)' }}>
              <Heart size={10} fill="white" stroke="white" />
            </div>
          )}
          {isPlatinated && (
            <div className="flex h-5 items-center rounded-full px-1.5 text-[9px] font-bold backdrop-blur-sm" style={{ background: 'rgba(250,204,21,0.9)', color: '#000' }}>
              100%
            </div>
          )}
        </div>
      )}

      {showStatus && log.status && log.status !== 'platinated' && (
        <span
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ background: STATUS_COLORS[log.status] || 'rgba(100,100,100,0.85)' }}
        >
          <StatusIcon status={log.status} size={10} strokeWidth={3} />
        </span>
      )}

      <div className="absolute bottom-0 left-0 flex flex-col items-start gap-1 p-2.5">
        {(achievements || episodes) && (
          <div className="flex h-5 items-center rounded bg-black/50 px-1.5 text-[10px] text-white/80 tabular-nums backdrop-blur-sm">
            {achievements ? `${achievements.unlocked}/${achievements.total}` : `${episodes!.watched}/${episodes!.total}`}
          </div>
        )}
        <div className="hidden sm:flex items-center gap-0.5">
          <Stars rating={log.rating} size={10} />
        </div>
        {log.rating != null && (
          <div className="flex sm:hidden items-center gap-0.5 text-[10px] font-semibold leading-none text-white/85">
            <Star size={9} fill="var(--mdf-yellow)" stroke="var(--mdf-yellow)" />
            {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(log.rating)}
          </div>
        )}
      </div>

      {hasHours && (
        <div className="absolute bottom-2.5 right-2.5 h-5 items-center rounded bg-black/50 px-1.5 text-[10px] text-white/70 tabular-nums backdrop-blur-sm">
          {formatHours(log.hours_spent)}
        </div>
      )}

      {actions && (
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {actions}
        </div>
      )}
      </Link>

      <div className="text-[10px] font-medium text-center text-white/70 leading-tight truncate w-full">{log.media_item.title}</div>
    </div>
  );
};

export default YgpCard;
