import { useEffect, useState, useRef, useCallback } from 'react';
import api, { uploadFile } from '../services/api';
import type { User } from '../types';
import type { Post, TimelineEntry, FeedItem, EpisodeTimelineEvent } from '../types/feed';
import PostCard from '../components/PostCard';
import LogCard from '../components/LogCard';
import LogGroupCard from '../components/LogGroupCard';
import EpisodeEventCard from '../components/EpisodeEventCard';
import { Clock, Image as ImageIcon, X } from 'lucide-react';
import { imageUrl, parseServerDate } from '../utils';

interface TimelinePageProps {
  user: User;
}

const IMAGE_URL = (url: string) => imageUrl(url) || '';
const PAGE_SIZE = 25;

const TimelinePage = ({ user }: TimelinePageProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [entries, setEntries] = useState<(TimelineEntry | EpisodeTimelineEvent)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postOffset, setPostOffset] = useState(0);
  const [before, setBefore] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadFeed = useCallback(async () => {
    const [p, e] = await Promise.all([
      api.get('/posts/posts/feed', { params: { user_id: user.id, limit: PAGE_SIZE, offset: 0 } }).then(r => r.data).catch(() => []),
      api.get(`/users/${user.id}/timeline`, { params: { limit: PAGE_SIZE } }).then(r => r.data).catch(() => []),
    ]);
    setPosts(p.map((x: Post) => ({ ...x, _type: 'post' as const })));
    setEntries(e.map((x: TimelineEntry | EpisodeTimelineEvent) => {
      if (x._type === 'episode_event') return x;
      return { ...x, _type: 'log' as const };
    }));
    setPostOffset(p.length);
    setHasMorePosts(p.length >= PAGE_SIZE);
    setHasMoreLogs(e.length >= PAGE_SIZE);
    setBefore(e.length > 0 ? ((e[e.length - 1] as TimelineEntry).created_at || (e[e.length - 1] as TimelineEntry).log_date) : null);
  }, [user.id]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loading) return;
    if (!hasMorePosts && !hasMoreLogs) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const [p, e] = await Promise.all([
        hasMorePosts
          ? api.get('/posts/posts/feed', { params: { user_id: user.id, limit: PAGE_SIZE, offset: postOffset } }).then(r => r.data).catch(() => [])
          : Promise.resolve([]),
        hasMoreLogs
          ? api.get(`/users/${user.id}/timeline`, { params: { limit: PAGE_SIZE, before } }).then(r => r.data).catch(() => [])
          : Promise.resolve([]),
      ]);
      if (p.length > 0) {
        setPosts(prev => {
          const seen = new Set(prev.map(x => x.id));
          return [...prev, ...p.filter((x: Post) => !seen.has(x.id)).map((x: Post) => ({ ...x, _type: 'post' as const }))];
        });
      }
      if (e.length > 0) {
        setEntries(prev => {
          const seen = new Set(prev.map(x => x.id));
          return [...prev, ...e.filter((x: TimelineEntry | EpisodeTimelineEvent) => !seen.has(x.id)).map((x: TimelineEntry | EpisodeTimelineEvent) => {
            if (x._type === 'episode_event') return x;
            return { ...x, _type: 'log' as const };
          })];
        });
        setBefore(((e[e.length - 1] as TimelineEntry).created_at || (e[e.length - 1] as TimelineEntry).log_date) ?? ((e[e.length - 1] as EpisodeTimelineEvent).created_at || (e[e.length - 1] as EpisodeTimelineEvent).log_date));
      }
      setPostOffset(o => o + p.length);
      setHasMorePosts(p.length >= PAGE_SIZE);
      setHasMoreLogs(e.length >= PAGE_SIZE);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, hasMorePosts, hasMoreLogs, postOffset, before, user.id]);

  useEffect(() => {
    loadFeed().then(() => setLoading(false));
  }, [loadFeed]);

  useEffect(() => {
    if (!sentinelRef.current || loading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '600px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, loading, hasMorePosts, hasMoreLogs]);

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
          await uploadFile(`/posts/posts/upload-image?post_id=${postId}&user_id=${user.id}`, formData);
        }
      }
      setNewPostText('');
      setSelectedFiles([]);
      setPreviews([]);
      await loadFeed();
    } catch {}
    setPosting(false);
  };

  const handleReply = async (postId: number, content: string) => {
    try {
      await api.post(`/posts/posts/${postId}/reply`, null, {
        params: { user_id: user.id, content },
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies_count: p.replies_count + 1 } : p));
    } catch {}
  };

  const handleEdit = async (postId: number, content: string) => {
    try {
      const res = await api.put(`/posts/posts/${postId}`, null, {
        params: { user_id: user.id, content },
      });
      const updated = res.data as Post;
      setPosts(prev => prev.map(p => p.id === postId ? { ...updated, _type: 'post' as const } : p));
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

  const handleLogReply = async (logId: number, content: string) => {
    try {
      await api.post(`/media/logs/${logId}/reply`, null, {
        params: { user_id: user.id, content },
      });
      setEntries(prev => prev.map(e => e.id === logId ? { ...e, replies_count: (e.replies_count || 0) + 1 } : e));
    } catch {}
  };

  const handleLogLike = async (logId: number) => {
    const entry = entries.find(e => e.id === logId);
    if (!entry) return;
    const wasLiked = entry.is_liked;
    const me = { username: user.username, avatar_url: user.avatar_url };
    setEntries(prev => prev.map(e => e.id === logId ? {
      ...e,
      is_liked: !wasLiked,
      likes_count: (e.likes_count || 0) + (wasLiked ? -1 : 1),
      liked_by: wasLiked
        ? (e.liked_by || []).filter(l => l.username !== user.username)
        : [me, ...(e.liked_by || [])].slice(0, 5),
    } : e));
    try {
      if (wasLiked) {
        await api.delete(`/media/logs/${logId}/like`, { params: { user_id: user.id } });
      } else {
        await api.post(`/media/logs/${logId}/like`, null, { params: { user_id: user.id } });
      }
    } catch {
      const originalLikedBy = entry.liked_by || [];
      setEntries(prev => prev.map(e => e.id === logId ? {
        ...e,
        is_liked: wasLiked,
        likes_count: (e.likes_count || 0) + (wasLiked ? 1 : -1),
        liked_by: originalLikedBy,
      } : e));
    }
  };

  const handleEpEventReply = async (eventId: number, content: string) => {
    try {
      await api.post(`/media/episode-events/${eventId}/reply`, null, {
        params: { user_id: user.id, content },
      });
      setEntries(prev => prev.map(e => {
        const eid = typeof e.id === 'string' ? parseInt(e.id.replace('ep_evt_', '')) : e.id;
        return eid === eventId ? { ...e, replies_count: (e.replies_count || 0) + 1 } : e;
      }));
    } catch {}
  };

  const handleEpEventLike = async (eventId: number) => {
    const entry = entries.find(e => {
      const eid = typeof e.id === 'string' ? parseInt(e.id.replace('ep_evt_', '')) : e.id;
      return eid === eventId;
    });
    if (!entry) return;
    const wasLiked = entry.is_liked;
    const me = { username: user.username, avatar_url: user.avatar_url };
    setEntries(prev => prev.map(e => {
      const eid = typeof e.id === 'string' ? parseInt(e.id.replace('ep_evt_', '')) : e.id;
      return eid === eventId ? {
        ...e,
        is_liked: !wasLiked,
        likes_count: (e.likes_count || 0) + (wasLiked ? -1 : 1),
        liked_by: wasLiked
          ? (e.liked_by || []).filter(l => l.username !== user.username)
          : [me, ...(e.liked_by || [])].slice(0, 5),
      } : e;
    }));
    try {
      if (wasLiked) {
        await api.delete(`/media/episode-events/${eventId}/like`, { params: { user_id: user.id } });
      } else {
        await api.post(`/media/episode-events/${eventId}/like`, null, { params: { user_id: user.id } });
      }
    } catch {
      setEntries(prev => prev.map(e => {
        const eid = typeof e.id === 'string' ? parseInt(e.id.replace('ep_evt_', '')) : e.id;
        return eid === eventId ? {
          ...e,
          is_liked: wasLiked,
          likes_count: (e.likes_count || 0) + (wasLiked ? 1 : -1),
          liked_by: entry.liked_by || [],
        } : e;
      }));
    }
  };

  const handleEpEventDelete = async (eventId: string | number) => {
    const numericId = typeof eventId === 'string' ? parseInt(String(eventId).replace('ep_evt_', '')) : eventId;
    try {
      await api.delete(`/media/episode-events/${numericId}`, { params: { user_id: user.id } });
      setEntries(prev => prev.filter(e => e.id !== eventId));
    } catch {}
  };

  const merged: FeedItem[] = [
    ...posts.map(p => ({ ...p, _sortDate: parseServerDate(p.created_at).getTime() } as FeedItem & { _sortDate: number })),
    ...entries.filter(e => e.log_date || e.created_at).map(e => {
      const sortDate = (e as EpisodeTimelineEvent).created_at || (e as TimelineEntry).created_at || e.log_date!;
      return { ...e, _sortDate: parseServerDate(sortDate).getTime() } as FeedItem & { _sortDate: number };
    }),
  ].sort((a, b) => (b as FeedItem & { _sortDate: number })._sortDate - (a as FeedItem & { _sortDate: number })._sortDate);

  return (
    <div className="space-y-6 max-w-[1844px] mx-auto">
      <div className="hidden lg:block">
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
              <PostCard key={`post-${item.id}`} post={item as Post} currentUser={user} onReply={handleReply} onDelete={handleDelete} onLike={handleLike} onEdit={handleEdit} />
            ) : item._type === 'episode_event' ? (
              <EpisodeEventCard key={`ep-${item.id}`} event={item as EpisodeTimelineEvent} currentUser={user} onReply={handleEpEventReply} onLike={handleEpEventLike} onDelete={handleEpEventDelete} />
            ) : (item as TimelineEntry).group_count ? (
              <LogGroupCard key={`group-${(item as TimelineEntry).id}`} entry={item as TimelineEntry} currentUser={user} onReply={handleLogReply} onLike={handleLogLike} />
            ) : (
              <LogCard key={`log-${item.id}`} entry={item as TimelineEntry} currentUser={user} onReply={handleLogReply} onLike={handleLogLike} />
            )
          )}
          {(hasMorePosts || hasMoreLogs) && (
            <div ref={sentinelRef} className="flex items-center justify-center py-6">
              {loadingMore ? (
                <div className="text-xs text-white/40">Carregando mais...</div>
              ) : (
                <div className="h-1 w-full" />
              )}
            </div>
          )}
          {!hasMorePosts && !hasMoreLogs && posts.length + entries.length > 0 && (
            <div className="py-6 text-center text-xs text-white/30">Fim do feed</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
