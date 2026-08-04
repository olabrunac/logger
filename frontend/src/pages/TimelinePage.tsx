import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { uploadFile } from '../services/api';
import type { User } from '../types';
import type { MediaItem } from '../types/media';
import { getStars, TYPE_META, STATUS_COLORS } from '../constants/designSystem';
import StatusIcon from '../components/StatusIcon';
import { PostImages } from '../components/PostImages';
import { Send, Image as ImageIcon, X, MessageCircle, Trash2, Clock, Heart, ThumbsUp } from 'lucide-react';
import { imageUrl, getLogUrl } from '../utils';

interface TimelinePageProps {
  user: User;
}

interface PostImage {
  id: number;
  url: string;
  is_gif: boolean;
  position: number;
}

interface PostReply {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

interface Post {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  images: PostImage[];
  replies_count: number;
  likes_count: number;
  is_liked: boolean;
  liked_by: { username: string; avatar_url?: string }[];
  created_at: string;
  _type: 'post';
}

interface TimelineEntry {
  id: number;
  user: { id: number; username: string; avatar_url?: string } | null;
  media_item: MediaItem | null;
  status: string | null;
  rating: number | null;
  review: string | null;
  platform: string | null;
  log_date: string | null;
  is_favorite: boolean | null;
  hours_spent: number | null;
  group_count?: number;
  group_items?: Array<{ id: number; title: string; cover_image_url?: string; status?: string }>;
  _type: 'log';
}

type FeedItem = Post | TimelineEntry;

const IMAGE_URL = (url: string) => imageUrl(url) || '';

  const statusLabels: Record<string, Record<string, string>> = {
    movie: {
      completed: 'assistiu',
      in_progress: 'está assistindo',
      dropped: 'deixou de assistir',
      wishlist: 'quer assistir',
      platinated: 'finalizou',
      library: 'tem na biblioteca',
    },
    series: {
      completed: 'assistiu',
      in_progress: 'está assistindo',
      dropped: 'deixou de assistir',
      wishlist: 'quer assistir',
      platinated: 'finalizou',
      library: 'tem na biblioteca',
    },
    game: {
      completed: 'jogou',
      in_progress: 'está jogando',
      dropped: 'abandonou',
      wishlist: 'quer jogar',
      platinated: 'platinou',
      library: 'tem na biblioteca',
    },
    book: {
      completed: 'leu',
      in_progress: 'está lendo',
      dropped: 'deixou de ler',
      wishlist: 'quer ler',
      platinated: 'finalizou',
      library: 'tem na biblioteca',
    },
  };

const PostCard = ({ post, currentUser, onReply, onDelete, onLike }: {
  post: Post;
  currentUser: User;
  onReply: (postId: number, content: string) => Promise<void>;
  onDelete: (postId: number) => void;
  onLike: (postId: number) => void;
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/posts/${post.id}/replies`);
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
    await onReply(post.id, replyText.trim());
    setReplyText('');
    await loadReplies();
    setSendingReply(false);
  };

  const getAvatar = (url?: string) => url ? IMAGE_URL(url) : null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="mdf-card rounded-xl overflow-hidden">
      <div className="p-4 pb-3 flex items-start gap-3">
        <Link to={`/profile/${post.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
            {getAvatar(post.avatar_url) ? (
              <img src={getAvatar(post.avatar_url)!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {post.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${post.username}`} className="text-sm font-bold text-white hover:underline">{post.username}</Link>
            <span className="text-xs text-white/30">{timeAgo(post.created_at)}</span>
            {post.user_id === currentUser.id && (
              <button onClick={() => onDelete(post.id)} className="ml-auto text-white/20 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-white/80 mt-1 whitespace-pre-wrap break-words">{post.content}</p>
        </div>
      </div>

      {post.images.length > 0 && (
        <PostImages images={post.images} />
      )}

      <div className="px-4 py-2 flex items-center gap-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleReplies} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <MessageCircle size={14} />
          {post.replies_count > 0 ? `${post.replies_count} resposta${post.replies_count > 1 ? 's' : ''}` : 'Responder'}
        </button>
        <button onClick={() => onLike(post.id)} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: post.is_liked ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}>
          <ThumbsUp size={14} fill={post.is_liked ? 'currentColor' : 'none'} />
          {post.likes_count > 0 ? post.likes_count : 'Curtir'}
        </button>
      </div>

      {post.likes_count > 0 && post.liked_by && post.liked_by.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex -space-x-1.5">
            {post.liked_by.slice(0, 5).map((liker) => (
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
            {post.likes_count === 1
              ? `${post.liked_by[0].username} curtiu`
              : post.liked_by.length <= post.likes_count && post.liked_by.length <= 5
                ? `${post.liked_by.map(l => l.username).join(', ')}${post.likes_count > post.liked_by.length ? ` e mais ${post.likes_count - post.liked_by.length}` : ''} curtiram`
                : `${post.likes_count} curtidas`
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
                    <p className="text-xs text-white/70 mt-0.5 whitespace-pre-wrap break-words">{reply.content}</p>
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
              ref={textareaRef}
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

const LogCard = ({ entry }: { entry: TimelineEntry }) => {
  if (!entry.user || !entry.media_item) return null;
  const meta = TYPE_META[entry.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(entry.user.avatar_url);
  const coverUrl = entry.media_item.cover_image_url
    ? imageUrl(entry.media_item.cover_image_url)
    : null;
  const statusLabel = entry.status
    ? (statusLabels[entry.media_item.media_type]?.[entry.status] ?? entry.status)
    : null;

  return (
    <Link to={getLogUrl(entry.media_item)} className="mdf-card mdf-card-hover rounded-xl p-4 flex gap-4 transition-colors block group">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={entry.user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
              {entry.user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm mb-2">
          <span className="font-bold text-white">{entry.user.username}</span>
          <span className="text-white/40">{statusLabel || 'registrou'}</span>
          <span className="text-white/40">{meta.emoji}</span>
        </div>

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
            </div>
            {entry.rating != null && entry.rating > 0 && (
              <div className="flex items-center gap-0.5 mt-1.5">
                {getStars(entry.rating).map((star, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                    fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                    stroke="var(--mdf-yellow)" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
            )}
            {entry.review && (
              <p className="text-xs text-white/40 mt-1.5 line-clamp-2">{entry.review.length > 150 ? entry.review.slice(0, 150) + '...' : entry.review}</p>
            )}
          </div>
        </div>

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
            <span>{entry.hours_spent}h</span>
          )}
        </div>
      </div>
    </Link>
  );
};


const LogGroupCard = ({ entry }: { entry: TimelineEntry }) => {
  if (!entry.user || !entry.media_item || !entry.group_items) return null;
  const meta = TYPE_META[entry.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(entry.user.avatar_url);
  const statusLabel = entry.status
    ? (statusLabels[entry.media_item.media_type]?.[entry.status] ?? entry.status)
    : 'registrou';

  return (
    <div className="mdf-card rounded-xl p-4 transition-colors">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={entry.user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {entry.user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm mb-3">
            <span className="font-bold text-white">{entry.user.username}</span>
            <span className="text-white/40">{statusLabel} {entry.group_count} {meta.singular.toLowerCase()}s</span>
            <span className="text-white/40">{meta.emoji}</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {entry.group_items.map((item) => {
              const itemStatusLabel = item.status ? statusLabels[entry.media_item!.media_type]?.[item.status] : null;
              return (
                <Link key={item.id} to={getLogUrl(entry.media_item!)} className="group/log-item flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors border" style={{ borderColor: 'var(--border)' }}>
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

          <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
            {entry.log_date && (
              <span>{new Date(entry.log_date).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const TimelinePage = ({ user }: TimelinePageProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get('/posts/posts/feed', { params: { user_id: user.id } }).then(r => r.data).catch(() => []),
      api.get(`/users/${user.id}/timeline`).then(r => r.data).catch(() => []),
    ]).then(([p, e]) => {
      setPosts(p.map((x: Post) => ({ ...x, _type: 'post' as const })));
      setEntries(e.map((x: TimelineEntry) => ({ ...x, _type: 'log' as const })));
      setLoading(false);
    });
  }, [user.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const hasGif = files.some(f => f.type === 'image/gif');
    if (hasGif) {
      setSelectedFiles([files.find(f => f.type === 'image/gif')!]);
      setPreviews([]);
    } else {
      setSelectedFiles(files.slice(0, Math.min(files.length, 4)));
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (selectedFiles.length === 0) { setPreviews([]); return; }
    const urls = selectedFiles.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [selectedFiles]);

  const getAvatar = (url?: string) => url ? IMAGE_URL(url) : null;

  const reloadFeed = () => {
    Promise.all([
      api.get('/posts/posts/feed', { params: { user_id: user.id } }).then(r => r.data).catch(() => []),
      api.get(`/users/${user.id}/timeline`).then(r => r.data).catch(() => []),
    ]).then(([p, e]) => {
      setPosts(p.map((x: Post) => ({ ...x, _type: 'post' as const })));
      setEntries(e.map((x: TimelineEntry) => ({ ...x, _type: 'log' as const })));
    });
  };

  const handlePost = async () => {
    if ((!newPostText.trim() && selectedFiles.length === 0) || posting) return;
    setPosting(true);
    try {
      const res = await api.post('/posts/posts', null, {
        params: { user_id: user.id, content: newPostText.trim() },
      });
      const postId = res.data.id;
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          await uploadFile(`/posts/posts/upload-image?post_id=${postId}`, formData);
        }
      }
      setNewPostText('');
      setSelectedFiles([]);
      setPreviews([]);
      await reloadFeed();
    } catch {}
    setPosting(false);
  };

  const handleReply = async (postId: number, content: string) => {
    try {
      await api.post(`/posts/posts/${postId}/reply`, null, {
        params: { user_id: user.id, content },
      });
    } catch {}
  };

  const handleDelete = async (postId: number) => {
    try {
      await api.delete(`/posts/posts/${postId}`, { params: { user_id: user.id } });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch {}
  };

  const handleLike = async (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.is_liked;
    const me = { username: user.username, avatar_url: user.avatar_url };
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      is_liked: !wasLiked,
      likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
      liked_by: wasLiked
        ? p.liked_by.filter(l => l.username !== user.username)
        : [me, ...p.liked_by].slice(0, 5),
    } : p));
    try {
      if (wasLiked) {
        await api.delete(`/posts/posts/${postId}/like`, { params: { user_id: user.id } });
      } else {
        await api.post(`/posts/posts/${postId}/like`, null, { params: { user_id: user.id } });
      }
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        is_liked: wasLiked,
        likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1,
      } : p));
    }
  };

  const merged: FeedItem[] = [
    ...posts.map(p => ({ ...p, _sortDate: new Date(p.created_at).getTime() } as FeedItem & { _sortDate: number })),
    ...entries.filter(e => e.log_date).map(e => ({ ...e, _sortDate: new Date(e.log_date!).getTime() } as FeedItem & { _sortDate: number })),
  ].sort((a, b) => (b as FeedItem & { _sortDate: number })._sortDate - (a as FeedItem & { _sortDate: number })._sortDate);

  return (
    <div className="space-y-6 max-w-[1844px] mx-auto">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight">Timeline</h1>
        <div className="text-white/50 text-sm mt-1">Atividades dos usuarios que voce segue</div>
      </div>

      {/* Composer */}
      <div className="mdf-card rounded-xl p-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: 'var(--accent)' }}>
            {getAvatar(user.avatar_url) ? (
              <img src={getAvatar(user.avatar_url)!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value.slice(0, 280))}
              placeholder="O que voce esta consumindo?"
              rows={3}
              className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-white/25 resize-none"
            />
            <div className="text-[10px] text-right" style={{ color: newPostText.length > 260 ? '#f87171' : 'var(--text-dim)' }}>
              {newPostText.length}/280
            </div>
          </div>
        </div>

        {previews.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {previews.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            <ImageIcon size={14} />
            {selectedFiles.length > 0 ? `${selectedFiles.length} imagem(ns)` : 'Adicionar imagem'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleFileSelect} />

          <button
            onClick={handlePost}
            disabled={posting || (!newPostText.trim() && selectedFiles.length === 0)}
            className="mdf-btn-primary text-xs disabled:opacity-30"
          >
            {posting ? 'Postando...' : 'Postar'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
      ) : merged.length === 0 ? (
        <div className="mdf-card p-12 text-center">
          <Clock size={48} className="mx-auto mb-4 text-white/20" />
          <h3 className="font-display text-xl font-bold text-white/60 mb-2">Nenhuma atividade</h3>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Siga outros usuarios ou poste algo para comecar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {merged.map((item) =>
            item._type === 'post' ? (
              <PostCard key={`post-${item.id}`} post={item as Post} currentUser={user} onReply={handleReply} onDelete={handleDelete} onLike={handleLike} />
            ) : (item as TimelineEntry).group_count ? (
              <LogGroupCard key={`group-${(item as TimelineEntry).id}`} entry={item as TimelineEntry} />
            ) : (
              <LogCard key={`log-${item.id}`} entry={item as TimelineEntry} />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
