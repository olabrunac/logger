import { Link } from 'react-router-dom';
import type { EpisodeTimelineEvent } from '../types/feed';
import { TYPE_META } from '../constants/designSystem';
import HashtagText from './HashtagText';
import Stars from './Stars';
import { imageUrl, getLogUrl, timeAgo } from '../utils';
import { Eye, MessageSquareText } from 'lucide-react';

interface EpisodeEventCardProps {
  event: EpisodeTimelineEvent;
}

const EpisodeEventCard = ({ event }: EpisodeEventCardProps) => {
  if (!event.user || !event.media_item) return null;
  const meta = TYPE_META[event.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(event.user.avatar_url);
  const coverUrl = event.media_item.cover_image_url ? imageUrl(event.media_item.cover_image_url) : null;

  const isWatch = event.event_type === 'watched';
  const isMulti = event.episode_start !== event.episode_end;

  const epLabel = isMulti
    ? `S${String(event.season_number).padStart(2, '0')}E${String(event.episode_start).padStart(2, '0')} a S${String(event.season_number).padStart(2, '0')}E${String(event.episode_end).padStart(2, '0')}`
    : `S${String(event.season_number).padStart(2, '0')}E${String(event.episode_end).padStart(2, '0')}`;

  const description = isWatch
    ? isMulti
      ? `maratonou ${epLabel}`
      : `assistiu ${epLabel}`
    : `avaliou ${epLabel}`;

  return (
    <div className="mdf-card rounded-xl p-4">
      <div className="flex gap-3">
        <Link to={`/profile/${event.user.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {event.user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <Link to={`/profile/${event.user.username}`} className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              {event.user.username}
            </Link>
            <span className="text-white/50">{description}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/30">
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
            <span>·</span>
            <span>{timeAgo(event.created_at)}</span>
          </div>
        </div>
        {coverUrl && (
          <Link to={getLogUrl(event.media_item)} className="flex-shrink-0">
            <div className="w-10 h-14 rounded overflow-hidden">
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            </div>
          </Link>
        )}
      </div>
      {event.event_type === 'reviewed' && (event.review_text || event.rating) && (
        <div className="mt-3 ml-[52px]">
          {event.rating != null && event.rating > 0 && (
            <div className="mb-1">
              <Stars rating={event.rating} size={12} />
            </div>
          )}
          {event.review_text && (
            <div className="text-xs text-white/60 leading-relaxed">
              <HashtagText text={event.review_text} />
            </div>
          )}
        </div>
      )}
      <div className="ml-[52px] mt-2 flex items-center gap-3 text-[10px] text-white/30">
        <span className="flex items-center gap-1">
          {isWatch ? <Eye size={10} /> : <MessageSquareText size={10} />}
          {isWatch ? 'Episodio assistido' : 'Review de episodio'}
        </span>
      </div>
    </div>
  );
};

export default EpisodeEventCard;
