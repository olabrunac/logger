import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import type { EpisodeTimelineEvent } from '../types/feed';
import { TYPE_META } from '../constants/designSystem';
import HashtagText from './HashtagText';
import Stars from './Stars';
import { imageUrl, getLogUrl, timeAgo } from '../utils';
import { MessageSquareText, Send, ThumbsUp, MessageCircle, Trash2 } from 'lucide-react';

interface EpisodeEventReply {
  id: number;
  episode_event_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

interface EpisodeEventCardProps {
  event: EpisodeTimelineEvent;
  currentUser: User;
  onReply: (eventId: number, content: string) => Promise<void>;
  onLike: (eventId: number) => void;
  onDelete: (eventId: string | number) => void;
}

const EpisodeEventCard = ({ event, currentUser, onReply, onLike, onDelete }: EpisodeEventCardProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<EpisodeEventReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedReview, setExpandedReview] = useState(false);

  if (!event.user || !event.media_item) return null;
  const meta = TYPE_META[event.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(event.user.avatar_url);
  const coverUrl = event.media_item.cover_image_url ? imageUrl(event.media_item.cover_image_url) : null;

  const numericId = typeof event.id === 'string' ? parseInt(event.id.replace('ep_evt_', '')) : event.id;

  const isMulti = event.episode_start !== event.episode_end;
  const epLabel = isMulti
    ? `S${String(event.season_number).padStart(2, '0')}E${String(event.episode_start).padStart(2, '0')} a S${String(event.season_number).padStart(2, '0')}E${String(event.episode_end).padStart(2, '0')}`
    : `S${String(event.season_number).padStart(2, '0')}E${String(event.episode_end).padStart(2, '0')}`;

  const hasReview = event.event_type === 'reviewed' && (event.review_text || (event.rating != null && event.rating > 0));

  const description = hasReview
    ? (isMulti
      ? `maratonou e avaliou ${epLabel}`
      : `assistiu e avaliou ${epLabel}`)
    : isMulti
      ? `maratonou ${epLabel}`
      : `assistiu ${epLabel}`;

  const reviewTruncated = (event.review_text?.length ?? 0) > 150;
  const displayReview = reviewTruncated && !expandedReview
    ? event.review_text!.slice(0, 150) + '...'
    : event.review_text;

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/media/episode-events/${numericId}/replies`);
      setReplies(res.data);
    } catch {}
    setLoadingReplies(false);
  };

  const toggleReplies = () => {
    if (!showReplies) loadReplies();
    setShowReplies(!showReplies);
  };

  const handleReply = async () => {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    await onReply(numericId, replyText.trim());
    setReplyText('');
    await loadReplies();
    setSendingReply(false);
  };

  const likesCount = event.likes_count || 0;
  const likedBy = event.liked_by || [];

  return (
    <div className="mdf-card rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex gap-4">
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
            <div className="flex items-center gap-1.5 text-sm mb-2">
              <Link to={`/profile/${event.user.username}`} className="font-bold text-white hover:underline">{event.user.username}</Link>
              <span className="text-white/40">{description}</span>
              <span className="text-white/40">{meta.emoji}</span>
            </div>

            <Link to={getLogUrl(event.media_item)} className="block group rounded-lg p-2 -m-2 hover:bg-white/[0.03] transition-colors">
              <div className="flex gap-3 items-start">
                {coverUrl ? (
                  <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ borderBottom: '3px solid ' + meta.color }}>
                    <img src={coverUrl} alt={event.media_item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-20 rounded-lg flex items-center justify-center flex-shrink-0 text-xl" style={{ background: meta.color + '22', borderBottom: '3px solid ' + meta.color }}>
                    {meta.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white/80 truncate">{event.media_item.title}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{epLabel}</div>
                </div>
              </div>
            </Link>

            {hasReview && (
              <div className="mt-2">
                {event.rating != null && event.rating > 0 && (
                  <div className="mb-1">
                    <Stars rating={event.rating} size={12} />
                  </div>
                )}
                {event.review_text && (
                  <div className="text-xs text-white/60 leading-relaxed">
                    <HashtagText text={displayReview || ''} />
                    {reviewTruncated && (
                      <button onClick={() => setExpandedReview(!expandedReview)} className="text-[10px] ml-1 hover:underline" style={{ color: 'var(--accent)' }}>
                        {expandedReview ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="px-4 py-2 flex items-center gap-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleReplies} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <MessageCircle size={14} />
          {(event.replies_count || 0) > 0 ? `${event.replies_count} resposta${(event.replies_count || 0) > 1 ? 's' : ''}` : 'Responder'}
        </button>
        <button
          onClick={() => onLike(numericId)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: event.is_liked ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}
        >
          <ThumbsUp size={14} fill={event.is_liked ? 'currentColor' : 'none'} />
          {likesCount > 0 ? likesCount : 'Curtir'}
        </button>
        {event.user?.id === currentUser.id && (
          <button
            onClick={() => onDelete(event.id)}
            className="ml-auto p-1 text-white/20 hover:text-red-400 transition-colors"
            title="Excluir post"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Liked by */}
      {likesCount > 0 && likedBy.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex -space-x-1.5">
            {likedBy.slice(0, 5).map((liker) => (
              <Link key={liker.username} to={`/profile/${liker.username}`} className="relative block">
                <div className="w-5 h-5 rounded-full overflow-hidden border" style={{ borderColor: 'var(--mdf-bg)' }}>
                  {liker.avatar_url ? (
                    <img src={imageUrl(liker.avatar_url) || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[7px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                      {liker.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <span className="text-[10px] text-white/30">
            {likedBy.length === 1 ? `${likedBy[0].username} curtiu` : `${likedBy[0].username} e mais ${likedBy.length - 1} curtiram`}
          </span>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
          {loadingReplies ? (
            <div className="text-[10px] text-white/30">Carregando...</div>
          ) : replies.length === 0 ? (
            <div className="text-[10px] text-white/20">Nenhuma resposta</div>
          ) : (
            replies.map(r => (
              <div key={r.id} className="flex gap-2">
                <Link to={`/profile/${r.username}`} className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    {r.avatar_url ? (
                      <img src={imageUrl(r.avatar_url) || ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                        {r.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold mr-1" style={{ color: 'var(--accent)' }}>{r.username}</span>
                  <span className="text-sm text-white/60">{r.content}</span>
                </div>
                <span className="text-[9px] text-white/20 flex-shrink-0">{timeAgo(r.created_at)}</span>
              </div>
            ))
          )}
          <div className="flex gap-2 mt-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReply()}
              placeholder="Responder..."
              className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-[10px] text-white placeholder:text-white/20 outline-none border-none"
            />
            <button onClick={handleReply} disabled={!replyText.trim() || sendingReply} className="p-1.5 rounded-full transition-colors" style={{ color: 'var(--accent)' }}>
              <Send size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodeEventCard;
