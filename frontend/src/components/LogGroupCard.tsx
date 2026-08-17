import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import type { TimelineEntry, GroupItem } from '../types/feed';
import { TYPE_META } from '../constants/designSystem';
import { statusLabels } from '../constants/statusLabels';
import { imageUrl, getLogUrl, timeAgo } from '../utils';
import HashtagText from './HashtagText';
import { ChevronRight, MessageCircle, ThumbsUp, Send } from 'lucide-react';

interface LogReplyItem {
  id: number;
  log_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

const groupItemUrl = (item: GroupItem): string => {
  let apiId: string | number | undefined = item.steam_appid || item.igdb_id || item.tmdb_id || item.google_books_id || item.id;
  if (item.google_books_id) apiId = item.google_books_id;
  return `/log/${item.media_type || 'movie'}/${apiId}`;
};

interface LogGroupCardProps {
  entry: TimelineEntry;
  currentUser: User;
  onReply: (logId: number, content: string) => Promise<void>;
  onLike: (logId: number) => void;
}

const LogGroupCard = ({ entry, currentUser, onReply, onLike }: LogGroupCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [twoLinesHeight, setTwoLinesHeight] = useState(0);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<LogReplyItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    const el = itemsRef.current;
    if (!el) return;
    const check = () => {
      const rowH = el.firstElementChild?.getBoundingClientRect().height || 0;
      const twoLines = rowH * 2 + 8;
      setTwoLinesHeight(twoLines);
      setClamped(twoLines > 0 && el.scrollHeight > twoLines);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [entry.group_items]);

  if (!entry.user || !entry.media_item || !entry.group_items) return null;
  const meta = TYPE_META[entry.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(entry.user.avatar_url);
  const statusLabel = entry.status
    ? (statusLabels[entry.media_item.media_type]?.[entry.status] ?? entry.status)
    : 'registrou';

  const getAvatar = (url?: string) => url ? imageUrl(url) : null;
  const likesCount = entry.likes_count || 0;
  const likedBy = entry.liked_by || [];
  const logId = entry.id as number;

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/media/logs/${logId}/replies`);
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
    await onReply(logId, replyText.trim());
    setReplyText('');
    await loadReplies();
    setSendingReply(false);
  };

  return (
    <div className="mdf-card rounded-xl overflow-hidden transition-colors">
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
            <div className="flex items-center gap-1.5 text-sm mb-3">
              <Link to={`/profile/${entry.user.username}`} className="font-bold text-white hover:underline">{entry.user.username}</Link>
              <span className="text-white/40">{statusLabel} {entry.group_count} {meta.label.toLowerCase()}</span>
              <span className="text-white/40">{meta.emoji}</span>
            </div>

            <div
              ref={itemsRef}
              className={`flex gap-2 flex-wrap ${!expanded && clamped ? 'overflow-hidden' : ''}`}
              style={!expanded && clamped && twoLinesHeight > 0 ? { maxHeight: twoLinesHeight } : undefined}
            >
              {entry.group_items.map((item) => {
                const itemStatusLabel = item.status ? statusLabels[item.media_type || '']?.[item.status] : null;
                return (
                  <Link key={item.id} to={groupItemUrl(item)} className="group/log-item flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors border" style={{ borderColor: 'var(--border)' }}>
                    {item.cover_image_url ? (
                      <div className="w-8 h-11 rounded overflow-hidden flex-shrink-0">
                        <img src={imageUrl(item.cover_image_url) || ''} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-11 rounded flex items-center justify-center flex-shrink-0 text-xs" style={{ background: meta.color + '22' }}>
                        {meta.emoji}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white/70 truncate max-w-[160px]">{item.title}</div>
                      {itemStatusLabel && (
                        <div className="text-[10px] text-white/40">{itemStatusLabel}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {clamped && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-[5px] font-semibold uppercase tracking-wide transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                {expanded ? 'Ver menos' : `Ver mais ${entry.group_count} ${meta.singular.toLowerCase()}s`}
                <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
            )}

            <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
              {entry.log_date && (
                <span>{new Date(entry.log_date).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="px-4 py-2 flex items-center gap-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleReplies} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <MessageCircle size={14} />
          {(entry.replies_count || 0) > 0 ? `${entry.replies_count} resposta${(entry.replies_count || 0) > 1 ? 's' : ''}` : 'Responder'}
        </button>
        <button
          onClick={() => onLike(logId)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: entry.is_liked ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}
        >
          <ThumbsUp size={14} fill={entry.is_liked ? 'currentColor' : 'none'} />
          {likesCount > 0 ? likesCount : 'Curtir'}
        </button>
      </div>

      {/* Liked by */}
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

      {/* Replies */}
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
                    <p className="text-sm text-white/70 mt-0.5 whitespace-pre-wrap break-words"><HashtagText text={reply.content} /></p>
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

export default LogGroupCard;
