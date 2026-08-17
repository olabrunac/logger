import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import type { TimelineEntry } from '../types/feed';
import { TYPE_META, STATUS_COLORS } from '../constants/designSystem';
import { statusLabels } from '../constants/statusLabels';
import StatusIcon from './StatusIcon';
import HashtagText from './HashtagText';
import Stars from './Stars';
import { Send, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { imageUrl, getLogUrl, timeAgo, formatHours } from '../utils';

interface LogReplyItem {
  id: number;
  log_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

interface LogCardProps {
  entry: TimelineEntry;
  currentUser: User;
  onReply: (logId: number, content: string) => Promise<void>;
  onLike: (logId: number) => void;
}

const IMAGE_URL = (url: string) => imageUrl(url) || '';

const LogCard = ({ entry, currentUser, onReply, onLike }: LogCardProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<LogReplyItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedReview, setExpandedReview] = useState(false);

  const reviewTruncated = (entry.review?.length ?? 0) > 150;

  if (!entry.user || !entry.media_item) return null;
  const meta = TYPE_META[entry.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(entry.user.avatar_url);
  const coverUrl = entry.media_item.cover_image_url
    ? imageUrl(entry.media_item.cover_image_url)
    : null;
  const statusLabel = entry.status
    ? (statusLabels[entry.media_item.media_type]?.[entry.status] ?? entry.status)
    : null;

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/media/logs/${entry.id}/replies`);
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
    await onReply(entry.id, replyText.trim());
    setReplyText('');
    await loadReplies();
    setSendingReply(false);
  };

  const getAvatar = (url?: string) => url ? IMAGE_URL(url) : null;

  const likesCount = entry.likes_count || 0;
  const likedBy = entry.liked_by || [];

  return (
    <div className="mdf-card rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex gap-4">
          <Link to={`/profile/${entry.user.username}`} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={entry.user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                  {entry.user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm mb-2">
              <Link to={`/profile/${entry.user.username}`} className="font-bold text-white hover:underline">{entry.user.username}</Link>
              <span className="text-white/40">{statusLabel || 'registrou'}</span>
              <span className="text-white/40">{meta.emoji}</span>
            </div>

            <Link to={getLogUrl(entry.media_item)} className="block group rounded-lg p-2 -m-2 hover:bg-white/[0.03] transition-colors">
            <div className="flex gap-3 items-start">
              {coverUrl ? (
                <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ borderBottom: '3px solid ' + meta.color }}>
                  <img src={coverUrl} alt={entry.media_item.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-20 rounded-lg flex items-center justify-center flex-shrink-0 text-xl" style={{ background: meta.color + '22', borderBottom: '3px solid ' + meta.color }}>
                  {meta.emoji}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white/80 truncate">{entry.media_item.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  {entry.status && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex items-center gap-1" style={{ background: STATUS_COLORS[entry.status] || 'rgba(100,100,100,0.85)' }}>
                      <StatusIcon status={entry.status} size={11} />
                      {entry.status === 'completed' ? 'Finalizado' : entry.status === 'in_progress' ? 'Em progresso' : entry.status === 'dropped' ? 'Abandonado' : entry.status === 'library' ? 'Biblioteca' : entry.status}
                    </span>
                  )}
                  {entry.platform && (
                    <span className="text-[10px] text-white/40">{entry.platform}</span>
                  )}
                  {entry.family_share && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>
                      Compartilhado
                    </span>
                  )}
                </div>
                {entry.rating != null && entry.rating > 0 && (
                  <div className="flex items-center gap-0.5 mt-1.5">
                    <Stars rating={entry.rating} size={12} />
                  </div>
                )}
                {entry.review && (
                  <div className="mt-1.5">
                    <p className={`${expandedReview ? 'text-[13px]' : 'text-[10px]'} text-white/40 leading-relaxed ${expandedReview ? '' : 'line-clamp-3'}`}>
                      <HashtagText text={expandedReview || !reviewTruncated ? entry.review : entry.review.slice(0, 150)} />
                    </p>
                    {reviewTruncated && (
                      <span
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedReview(!expandedReview); }}
                        className="text-[10px] cursor-pointer hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        {expandedReview ? 'Ver menos' : 'Ver mais'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            </Link>

            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
              {entry.log_date && (
                <span>{new Date(entry.log_date).toLocaleDateString('pt-BR')}</span>
              )}
              {entry.is_favorite && (
                <span className="flex items-center gap-0.5" style={{ color: 'var(--mdf-pink)' }}>
                  <Heart size={10} fill="currentColor" /> Favorito
                </span>
              )}
              {entry.hours_spent != null && entry.hours_spent > 0 && (
                <span>{formatHours(entry.hours_spent)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center gap-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleReplies} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <MessageCircle size={14} />
          {(entry.replies_count || 0) > 0 ? `${entry.replies_count} resposta${entry.replies_count! > 1 ? 's' : ''}` : 'Responder'}
        </button>
        <button onClick={() => onLike(entry.id)} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: entry.is_liked ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}>
          <ThumbsUp size={14} fill={entry.is_liked ? 'currentColor' : 'none'} />
          {likesCount > 0 ? likesCount : 'Curtir'}
        </button>
      </div>

      {likesCount > 0 && likedBy.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex -space-x-1.5">
            {likedBy.slice(0, 5).map((liker) => (
              <Link key={liker.username} to={`/profile/${liker.username}`} className="relative block">
                <div className="w-5 h-5 rounded-full overflow-hidden border" style={{ borderColor: 'var(--mdf-bg)' }}>
                  {getAvatar(liker.avatar_url) ? (
                    <img src={getAvatar(liker.avatar_url)!} alt="" className="w-full h-full object-cover" />
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
            {likesCount === 1
              ? `${likedBy[0].username} curtiu`
              : likedBy.length <= likesCount && likedBy.length <= 5
                ? `${likedBy.map(l => l.username).join(', ')}${likesCount > likedBy.length ? ` e mais ${likesCount - likedBy.length}` : ''} curtiram`
                : `${likesCount} curtidas`
            }
          </span>
        </div>
      )}

      {showReplies && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {loadingReplies ? (
            <div className="p-4 text-xs text-white/30 text-center">Carregando...</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {replies.map(reply => (
                <div key={reply.id} className="px-4 py-3 flex gap-2.5">
                  <Link to={`/profile/${reply.username}`} className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden">
                      {getAvatar(reply.avatar_url) ? (
                        <img src={getAvatar(reply.avatar_url)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                          {reply.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/profile/${reply.username}`} className="text-xs font-bold text-white hover:underline">{reply.username}</Link>
                      <span className="text-[10px] text-white/25">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-white/70 mt-0.5 whitespace-pre-wrap break-words"><HashtagText text={reply.content} /></p>
                  </div>
                </div>
              ))}
              {replies.length === 0 && (
                <div className="p-4 text-xs text-white/30 text-center">Nenhuma resposta ainda</div>
              )}
            </div>
          )}

          <div className="px-4 py-3 flex gap-2 items-end border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              {getAvatar(currentUser.avatar_url) ? (
                <img src={getAvatar(currentUser.avatar_url)!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value.slice(0, 280))}
              placeholder="Responda..."
              rows={1}
              className="flex-1 bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--accent)] outline-none rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/25 resize-none transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || sendingReply}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: 'var(--accent)' }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogCard;
