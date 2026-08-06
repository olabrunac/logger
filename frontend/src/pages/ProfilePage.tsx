import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { getUserCustomLists } from '../services/api';
import type { LogEntry, LogReview, User, TopListItem, CustomList } from '../types';
import ProfileHero from '../components/ProfileHero';
import MediaTypeProfilePage from './MediaTypeProfilePage';
import YgpCard from '../components/sections/YgpCard';
import SectionHeader from '../components/sections/SectionHeader';
import BadgesSection from '../components/sections/BadgesSection';
import LayoutEditorModal from '../components/sections/LayoutEditorModal';
import PostCard from '../components/PostCard';
import { TYPE_META, getStars } from '../constants/designSystem';
import type { Post } from '../types/feed';
import { imageUrl, getLogUrl, findBestLogForMedia } from '../utils';
import { Heart, Clock, Star, MessageCircle, Trophy, History, Layers, Menu } from 'lucide-react';

interface ProfilePageProps {
  currentUser: User;
  onUserUpdate?: (updatedUser: User) => void;
}

const IMAGE_URL = (url: string) => imageUrl(url) || '';

const ALL_MEDIA_TYPES = ['game', 'movie', 'series', 'book'] as const;

const STATUS_GROUP_DEFS = [
  { status: 'in_progress', label: 'Em Progresso' },
  { status: 'completed', label: 'Finalizados' },
  { status: 'wishlist', label: 'Lista de Desejos' },
  { status: 'library', label: 'Biblioteca' },
  { status: 'dropped', label: 'Abandonados' },
];

const mediaTypeIcon = (type: string) => <span className="text-xs leading-none">{TYPE_META[type]?.emoji || '📄'}</span>;

const ProfilePage = ({ currentUser, onUserUpdate }: ProfilePageProps) => {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reviewMap, setReviewMap] = useState<Map<number, LogReview[]>>(new Map());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [topListItems, setTopListItems] = useState<TopListItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [editingLayout, setEditingLayout] = useState(false);

  const displayUsername = username || currentUser.username;
  const isOwnProfile = displayUsername === currentUser.username;

  useEffect(() => {
    fetchData();
  }, [username]);

  useEffect(() => {
    if (isOwnProfile && currentUser) setProfileUser(currentUser);
  }, [currentUser, isOwnProfile]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let targetUser: User;
      if (isOwnProfile) {
        targetUser = currentUser;
      } else {
        const userRes = await api.get('/login/by-username/' + encodeURIComponent(displayUsername));
        targetUser = userRes.data;
      }
      setProfileUser(targetUser);
      const [logsRes, wishlistRes, topListRes, customListsRes] = await Promise.all([
        api.get('/media/logs', { params: { user_id: targetUser.id, limit: 500 } }),
        api.get('/media/wishlist', { params: { user_id: targetUser.id } }),
        api.get(`/media/users/${targetUser.id}/top-list`),
        getUserCustomLists(targetUser.id).catch(() => ({ data: [] })),
      ]);
      setTopListItems(topListRes.data || []);
      setCustomLists(customListsRes.data || []);
      const allLogs = [...(logsRes.data || []), ...(wishlistRes.data || [])];
      setLogs(allLogs);

      try {
        const postsRes = await api.get(`/posts/posts/user/${targetUser.id}`, { params: { current_user_id: currentUser.id, limit: 20 } });
        setPosts((postsRes.data || []).map((p: Post) => ({ ...p, _type: 'post' as const })));
      } catch {}

      if (!isOwnProfile) {
        try {
          const followRes = await api.get(`/users/${currentUser.id}/is-following/${targetUser.id}`);
          setIsFollowing(followRes.data.is_following);
        } catch {}
      }

      const reviewLogs = allLogs.filter((l: LogEntry) => l.review && l.review.trim().length > 0);
      if (reviewLogs.length > 0) {
        const r = await api.post('/media/logs/reviews-batch', reviewLogs.map((l: LogEntry) => l.id));
        const map = new Map<number, LogReview[]>();
        Object.entries(r.data).forEach(([logId, reviews]) => {
          if ((reviews as LogReview[]).length > 0) map.set(Number(logId), reviews as LogReview[]);
        });
        setReviewMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch profile data', err);
      setError('Perfil não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.id - a.id).slice(0, 12);
  }, [logs]);

  const reviewEntries = useMemo(() => {
    const entries: { review: LogReview; log: LogEntry }[] = [];
    logs.forEach(l => {
      const reviews = reviewMap.get(l.id);
      if (reviews) {
        reviews.forEach(r => entries.push({ review: r, log: l }));
      }
    });
    return entries.sort((a, b) => b.review.created_at.localeCompare(a.review.created_at));
  }, [logs, reviewMap]);

  const accentColor = profileUser?.accent_color || '#ff6b35';

  const sectionConfig = useMemo(() => {
    try {
      const raw = profileUser?.section_order;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // New per-category format
        const general = parsed.general;
        if (general && general.desktop) return general.desktop as Array<{ id: string; visible: boolean }>;
        // Old format fallback
        if (parsed.desktop) return parsed.desktop as Array<{ id: string; visible: boolean }>;
      }
      return null;
    } catch { return null; }
  }, [profileUser?.section_order]);

  const effectiveSections = useMemo(() => {
    const allDefs: Array<{ id: string; visible: boolean; label: string; icon?: React.ReactNode }> = [
      { id: 'favorite_games', visible: true, label: 'Favoritos', icon: <Heart className="h-3.5 w-3.5" /> },
      { id: 'recent_games', visible: true, label: 'Atividade recente', icon: <Clock className="h-3.5 w-3.5" /> },
      { id: 'reviews', visible: true, label: 'Reviews', icon: <Star className="h-3.5 w-3.5" /> },
      { id: 'posts', visible: true, label: 'Posts', icon: <MessageCircle className="h-3.5 w-3.5" /> },
      { id: 'top_5', visible: false, label: 'Top 5', icon: <Trophy className="h-3.5 w-3.5" /> },
      { id: 'recent', visible: false, label: 'Recentes', icon: <History className="h-3.5 w-3.5" /> },
      { id: 'general_all', visible: false, label: 'Geral (todos os logs)', icon: <Layers className="h-3.5 w-3.5" /> },
      { id: 'custom_lists', visible: false, label: 'Listas Personalizadas', icon: <Menu className="h-3.5 w-3.5" /> },
      ...ALL_MEDIA_TYPES.map(type => ({ id: `all_${type}`, visible: false, label: `Todos ${TYPE_META[type]?.label}`, icon: mediaTypeIcon(type) })),
      ...STATUS_GROUP_DEFS.flatMap(s => ALL_MEDIA_TYPES.map(type => ({ id: `${s.status}_${type}`, visible: false, label: `${s.label} ${TYPE_META[type]?.singular}`, icon: mediaTypeIcon(type) }))),
    ];

    if (!sectionConfig) return allDefs.filter(s => s.visible);

    const configMap = new Map(sectionConfig.map(s => [s.id, s.visible]));
    const order = sectionConfig.map(s => s.id);

    const ordered = allDefs
      .filter(s => order.includes(s.id))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    const remaining = allDefs.filter(s => !order.includes(s.id) && s.visible);

    return [...ordered, ...remaining].map(s => ({
      ...s,
      visible: configMap.has(s.id) ? configMap.get(s.id)! : s.visible,
    }));
  }, [sectionConfig]);

  const handleFollowToggle = async () => {
    if (!profileUser || followLoading) return;
    setFollowLoading(true);
    try {
      const delta = isFollowing ? -1 : 1;
      if (isFollowing) {
        await api.delete(`/users/${currentUser.id}/follow/${profileUser.id}`);
        setIsFollowing(false);
      } else {
        await api.post(`/users/${currentUser.id}/follow/${profileUser.id}`);
        setIsFollowing(true);
      }
      setProfileUser(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count ?? 0) + delta) } : prev);
      onUserUpdate?.({ ...currentUser, following_count: Math.max(0, (currentUser.following_count ?? 0) + delta) });
    } catch {}
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="space-y-10">
        <div className="mdf-card p-8 text-center text-white/50">
          <h3 className="text-white mb-2">{error || 'Perfil não encontrado'}</h3>
          <p className="text-sm mb-4">O usuário "{displayUsername}" não existe.</p>
          <Link to="/" className="mdf-btn-primary">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const renderRecentGames = () => (
    <section>
      <SectionHeader title="Atividade recente" linkTo={`/profile/${profileUser.username}/diary`} />
      {recentLogs.length === 0 ? (
        <div className="mdf-card p-8 text-center text-white/50">Nenhum log ainda.</div>
      ) : (
        <>
          <div className="hidden lg:grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
            {recentLogs.slice(0, 11).map(log => (
              <YgpCard key={log.id} log={log} accentColor={accentColor} />
            ))}
          </div>
          <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
            {recentLogs.slice(0, 12).map(log => (
              <div key={log.id} className="w-[28%] shrink-0">
                <YgpCard log={log} accentColor={accentColor} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );

  const renderFavoriteGames = () => {
    const byType: Record<string, TopListItem[]> = {};
    topListItems.forEach(item => {
      const t = item.media_item?.media_type || 'movie';
      if (!byType[t]) byType[t] = [];
      byType[t].push(item);
    });
    const orderedTypes = ['game', 'movie', 'series', 'book'];
    const items = orderedTypes.map(t => ({ type: t, items: (byType[t] || []).sort((a, b) => a.position - b.position) })).filter(x => x.items.length > 0);
    if (items.length === 0) {
      return (
        <section>
          <SectionHeader title="Favoritos" linkTo={`/profile/${profileUser.username}/games`} linkLabel="Ver mais" />
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhum favorito adicionado.</div>
        </section>
      );
    }
    return (
      <section>
        <SectionHeader title="Favoritos" linkTo={`/profile/${profileUser.username}/${items[0] ? TYPE_META[items[0].type]?.slug : 'games'}`} linkLabel="Ver mais" />
        <div className="hidden lg:grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
          {items.map(({ type, items: typeItems }, idx) => {
            const top = typeItems[0];
            const media = top.media_item;
            const meta = TYPE_META[type];
            const isGoat = idx === 0;
            return (
              <div key={type} className="min-w-0">
                <div className="relative">
                  {isGoat && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
                        <path d="M12 16v4"/>
                      </svg>
                    </div>
                  )}
                  {media ? (
                    <YgpCard
                      log={findBestLogForMedia(top.media_item_id, logs) || { id: top.id, media_item: media }}
                      rank={`#1 · ${meta?.label}`}
                      className={isGoat ? 'outline outline-2' : undefined}
                      style={{ outlineColor: isGoat ? '#F59E0B' : 'transparent', outlineOffset: 0 }}
                    />
                  ) : (
                    <div className="group relative flex flex-col overflow-hidden rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `3px solid ${meta?.color || '#666'}`, aspectRatio: '3/4' }}>
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                        <span className="text-3xl">{meta?.emoji || '📄'}</span>
                        <div className="text-xs text-white/70 font-medium line-clamp-3 mt-2">{type}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-2 lg:hidden">
          {items.map(({ type, items: typeItems }) => {
            const top = typeItems[0];
            const media = top.media_item;
            const meta = TYPE_META[type];
            const isGoat = type === items[0].type;
            return (
              <div key={type} className="min-w-0">
                {media ? (
                  <YgpCard
                    log={findBestLogForMedia(top.media_item_id, logs) || { id: top.id, media_item: media }}
                    rank={`#1 · ${meta?.label}`}
                    className={isGoat ? 'outline outline-2' : undefined}
                    style={{ outlineColor: isGoat ? '#F59E0B' : 'transparent', outlineOffset: 0 }}
                  />
                ) : (
                  <div className="group relative flex flex-col overflow-hidden rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `3px solid ${meta?.color || '#666'}`, aspectRatio: '3/4' }}>
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-3xl">{meta?.emoji || '📄'}</span>
                      <div className="text-xs text-white/70 font-medium line-clamp-3 mt-2">{type}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderReviews = () => {
    if (reviewEntries.length === 0) {
      return (
        <section>
          <SectionHeader title="Reviews" linkTo={`/profile/${profileUser.username}/reviews`} count={reviewEntries.length} />
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma review ainda.</div>
        </section>
      );
    }
    return (
      <section>
        <SectionHeader title="Reviews" linkTo={`/profile/${profileUser.username}/reviews`} count={reviewEntries.length} />
        <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 lg:hidden">
          {reviewEntries.slice(0, 10).map(e => {
            const meta = TYPE_META[e.log.media_item.media_type];
            return (
              <Link key={e.review.id} to={getLogUrl(e.log.media_item)} className="flex w-[260px] shrink-0 gap-3 rounded-2xl p-3 transition-colors hover:bg-white/5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {e.log.media_item.cover_image_url ? (
                  <img src={e.log.media_item.cover_image_url} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)', borderBottom: '3px solid ' + (meta?.color || '#666') }} loading="lazy" />
                ) : (
                  <div className="h-24 w-16 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderBottom: '3px solid ' + (meta?.color || '#666') }}>
                    <span className="text-sm">{meta?.emoji || '📄'}</span>
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-xs font-semibold text-white/80">{e.log.media_item.title}</p>
                  {e.review.rating != null && e.review.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--mdf-yellow)" stroke="var(--mdf-yellow)" strokeWidth="1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span className="text-[11px] font-bold text-white/80">{e.review.rating}</span>
                    </div>
                  )}
                  {e.review.review_text && <p className="line-clamp-3 text-[10px] leading-relaxed text-white/50">{e.review.review_text}</p>}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="hidden lg:grid lg:grid-cols-2 gap-3">
          {reviewEntries.slice(0, 6).map(e => {
            const meta = TYPE_META[e.log.media_item.media_type];
            return (
              <Link key={e.review.id} to={getLogUrl(e.log.media_item)} className="flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {e.log.media_item.cover_image_url ? (
                  <img src={e.log.media_item.cover_image_url} alt="" className="h-28 w-[72px] shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)', borderBottom: '3px solid ' + (meta?.color || '#666') }} loading="lazy" />
                ) : (
                  <div className="h-28 w-[72px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderBottom: '3px solid ' + (meta?.color || '#666') }}>
                    <span className="text-lg">{meta?.emoji || '📄'}</span>
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white/80">{e.log.media_item.title}</p>
                    {e.log.platform && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: (meta?.color || '#666') + '22', color: meta?.color }}>{e.log.platform}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {e.review.rating != null && e.review.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {getStars(e.review.rating).map((star, i) => (
                          <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                            fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'}
                            stroke="var(--mdf-yellow)" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-white/30">{new Date(e.review.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {e.review.review_text && <p className="line-clamp-4 text-[13px] leading-relaxed text-white/50 flex-1">{e.review.review_text.length > 320 ? e.review.review_text.slice(0, 320) + '…' : e.review.review_text}</p>}
                  {e.log.hours_spent != null && e.log.hours_spent > 0 && (
                    <div className="text-[10px] text-white/40 font-mono">{e.log.hours_spent}h</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  const renderPosts = () => {
    if (posts.length === 0) {
      return (
        <section>
          <SectionHeader title="Posts" linkTo="/timeline" count={posts.length} />
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhum post ainda.</div>
        </section>
      );
    }

    const handleReply = async (postId: number, content: string) => {
      try {
        await api.post(`/posts/posts/${postId}/reply`, null, {
          params: { user_id: currentUser.id, content },
        });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies_count: p.replies_count + 1 } : p));
      } catch {}
    };

    const handleLike = async (postId: number) => {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      const wasLiked = post.is_liked;
      const me = { username: currentUser.username, avatar_url: currentUser.avatar_url };
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        is_liked: !wasLiked,
        likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
        liked_by: wasLiked
          ? (p.liked_by || []).filter(l => l.username !== currentUser.username)
          : [me, ...(p.liked_by || [])].slice(0, 5),
      } : p));
      try {
        if (wasLiked) {
          await api.delete(`/posts/posts/${postId}/like`, { params: { user_id: currentUser.id } });
        } else {
          await api.post(`/posts/posts/${postId}/like`, null, { params: { user_id: currentUser.id } });
        }
      } catch {
        setPosts(prev => prev.map(p => p.id === postId ? {
          ...p,
          is_liked: wasLiked,
          likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1,
        } : p));
      }
    };

    const handleDelete = async (postId: number) => {
      try {
        await api.delete(`/posts/posts/${postId}`, { params: { user_id: currentUser.id } });
        setPosts(prev => prev.filter(p => p.id !== postId));
      } catch {}
    };

    const handleEdit = async (postId: number, content: string) => {
      try {
        const res = await api.put(`/posts/posts/${postId}`, null, {
          params: { user_id: currentUser.id, content },
        });
        const updated = res.data as Post;
        setPosts(prev => prev.map(p => p.id === postId ? { ...updated, _type: 'post' as const } : p));
      } catch {}
    };

    return (
      <section>
        <SectionHeader title="Posts" linkTo="/timeline" count={posts.length} />
        <div className="space-y-2">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onReply={handleReply}
              onDelete={handleDelete}
              onLike={handleLike}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </section>
    );
  };

  const perTypeBlocks = (renderer: (type: string, typeLogs: LogEntry[]) => React.ReactNode) =>
    ['game', 'movie', 'series', 'book'].map(type => {
      const typeLogs = logs.filter(l => l.media_item.media_type === type);
      if (typeLogs.length === 0) return null;
      return <div key={type}>{renderer(type, typeLogs)}</div>;
    });

  const renderTop5All = () => perTypeBlocks((type) => {
    const typeTop = topListItems
      .filter(item => item.media_item?.media_type === type)
      .sort((a, b) => a.position - b.position);
    if (typeTop.length === 0) return null;
    const meta = TYPE_META[type];
    return (
      <section>
        <SectionHeader title={`Top 5 · ${meta?.label}`} />
        <div className="hidden gap-2 lg:flex lg:items-start lg:justify-center">
          {typeTop.map((item, index) => {
            const isGoat = index === 0;
            return (
              <div key={item.id} className="min-w-0 shrink-0" style={{ width: 'calc((100% - 32px) / 5)', maxWidth: 'calc((100% - 32px) / 5)' }}>
                <div className="relative">
                  {isGoat && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
                        <path d="M12 16v4"/>
                      </svg>
                    </div>
                  )}
                  {item.media_item ? (
                    <YgpCard log={{ id: item.id, media_item: item.media_item }} rank={`#${index + 1}`} className={isGoat ? 'outline outline-2' : undefined} style={{ outlineColor: isGoat ? '#F59E0B' : 'transparent', outlineOffset: 0 }} />
                  ) : (
                    <div className="group relative flex flex-col overflow-hidden rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `3px solid ${meta?.color || '#666'}`, aspectRatio: '3/4' }}>
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs" style={{ background: (meta?.color || '#666') + '11' }}>{meta?.emoji}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
          {typeTop.map((item, index) => (
            <div key={item.id} className="w-[28%] shrink-0">
              {item.media_item ? (
                <YgpCard log={{ id: item.id, media_item: item.media_item }} rank={`#${index + 1}`} />
              ) : (
                <div className="group relative flex flex-col overflow-hidden rounded-lg w-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `3px solid ${meta?.color || '#666'}`, aspectRatio: '3/4' }}>
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs" style={{ background: (meta?.color || '#666') + '11' }}>{meta?.emoji}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  });

  const renderGrid = (title: string, gridLogs: LogEntry[], sortByTitle = false, limit = 12) => {
    let items = gridLogs;
    if (sortByTitle) {
      items = [...gridLogs].sort((a, b) => (a.media_item?.title || '').localeCompare(b.media_item?.title || '', 'pt-BR', { sensitivity: 'base', numeric: true }));
    }
    return (
      <section>
        <SectionHeader title={title} count={items.length} />
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
          {items.slice(0, limit).map(log => <YgpCard key={log.id} log={log} accentColor={accentColor} />)}
        </div>
      </section>
    );
  };

  const renderRecentAll = () => {
    const sorted = [...logs].sort((a, b) => b.id - a.id);
    return renderGrid('Recentes', sorted, false);
  };

  const renderStatusType = (status: string, type: string, label: string) => {
    const singular = TYPE_META[type]?.singular || type;
    const sectionLogs = logs.filter(l => l.media_item.media_type === type && l.status === status);
    if (sectionLogs.length === 0) return null;
    return renderGrid(`${label} ${singular}`, sectionLogs, status === 'library');
  };

  const renderAllType = (type: string) => {
    const meta = TYPE_META[type];
    const typeLogs = logs.filter(l => l.media_item.media_type === type);
    if (typeLogs.length === 0) return null;
    return renderGrid(`Todos ${meta?.label}`, typeLogs, true);
  };

  const renderCustomListsAll = () => ['game', 'movie', 'series', 'book'].map(type => {
    const meta = TYPE_META[type];
    const lists = customLists.filter(list => list.items.some(item => item.media_item?.media_type === type));
    if (lists.length === 0) return null;
    return (
      <section key={type}>
        <SectionHeader title={`Listas Personalizadas · ${meta?.label}`} count={lists.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map(list => (
            <Link key={list.id} to={`/profile/${profileUser?.username}/lists`} className="mdf-card mdf-card-hover rounded-xl p-4 transition-colors block group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-lg font-bold text-white/80 truncate">{list.name}</h3>
                <span className="text-xs text-white/40 font-mono">{list.items.length} itens</span>
              </div>
              {list.description && <p className="text-sm text-white/40 line-clamp-2 mb-3">{list.description}</p>}
              <div className="flex gap-1.5 overflow-hidden">
                {list.items.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="w-12 rounded-md overflow-hidden flex-shrink-0" style={{ aspectRatio: '2/3' }}>
                    {item.media_item?.cover_image_url ? (
                      <img src={item.media_item.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: (TYPE_META[item.media_item?.media_type]?.color || '#666') + '22' }}>
                        {TYPE_META[item.media_item?.media_type]?.emoji || '📄'}
                      </div>
                    )}
                  </div>
                ))}
                {list.items.length > 6 && (
                  <div className="w-12 rounded-md flex items-center justify-center flex-shrink-0 text-xs text-white/40" style={{ background: 'var(--bg-elevated)', aspectRatio: '2/3' }}>
                    +{list.items.length - 6}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  });

  const PROFILE_SECTIONS: Array<{ id: string; label: string; icon?: React.ReactNode; group?: string }> = [
    { id: 'favorite_games', label: 'Favoritos', icon: <Heart className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'recent_games', label: 'Atividade Recente', icon: <Clock className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'posts', label: 'Posts', icon: <MessageCircle className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'top_5', label: 'Top 5', icon: <Trophy className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'recent', label: 'Recentes', icon: <History className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'general_all', label: 'Geral (todos os logs)', icon: <Layers className="h-3.5 w-3.5" />, group: 'Principal' },
    { id: 'custom_lists', label: 'Listas Personalizadas', icon: <Menu className="h-3.5 w-3.5" />, group: 'Principal' },
    ...ALL_MEDIA_TYPES.map(type => ({ id: `all_${type}`, label: `Todos ${TYPE_META[type]?.label}`, icon: mediaTypeIcon(type), group: 'Todos por mídia' })),
    ...STATUS_GROUP_DEFS.flatMap(s =>
      ALL_MEDIA_TYPES.map(type => ({ id: `${s.status}_${type}`, label: `${s.label} ${TYPE_META[type]?.singular}`, icon: mediaTypeIcon(type), group: s.label })),
    ),
  ];

  const handleSaveLayout = async (newSections: { id: string; visible: boolean }[]) => {
    const raw = profileUser?.section_order;
    let parsed: Record<string, any> = {};
    try { if (raw) parsed = JSON.parse(raw); } catch {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
    parsed.general = { ...(parsed.general || {}), desktop: newSections };
    await api.put(`/users/${profileUser!.id}/profile`, { section_order: JSON.stringify(parsed) });
    setProfileUser(prev => prev ? { ...prev, section_order: JSON.stringify(parsed) } : prev);
    setEditingLayout(false);
  };

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    favorite_games: renderFavoriteGames,
    recent_games: renderRecentGames,
    reviews: renderReviews,
    posts: renderPosts,
    top_5: renderTop5All,
    recent: renderRecentAll,
    general_all: () => renderGrid('Geral', logs, true),
    custom_lists: renderCustomListsAll,
  };

  for (const type of ALL_MEDIA_TYPES) {
    sectionRenderers[`all_${type}`] = () => renderAllType(type);
  }
  for (const s of STATUS_GROUP_DEFS) {
    for (const type of ALL_MEDIA_TYPES) {
      sectionRenderers[`${s.status}_${type}`] = () => renderStatusType(s.status, type, s.label);
    }
  }

  const viewRenderers: Record<string, () => React.ReactNode> = {
    reviews: () => (
      <section>
        <SectionHeader title="Reviews" count={reviewEntries.length} />
        {reviewEntries.length === 0 ? (
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma review ainda.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviewEntries.slice(0, 50).map(e => {
              const meta = TYPE_META[e.log.media_item.media_type];
              return (
                <Link key={e.review.id} to={getLogUrl(e.log.media_item)} className="flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {e.log.media_item.cover_image_url ? (
                    <img src={e.log.media_item.cover_image_url} alt="" className="h-28 w-[72px] shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)', borderBottom: '3px solid ' + (meta?.color || '#666') }} loading="lazy" />
                  ) : (
                    <div className="h-28 w-[72px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderBottom: '3px solid ' + (meta?.color || '#666') }}>
                      <span className="text-lg">{meta?.emoji || '📄'}</span>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="truncate text-sm font-semibold text-white/80">{e.log.media_item.title}</p>
                    {e.review.rating != null && e.review.rating > 0 && (
                      <div className="flex items-center gap-0.5">{getStars(e.review.rating).map((star, i) => (
                        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'} stroke="var(--mdf-yellow)" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>))}</div>
                    )}
                    <span className="text-[10px] text-white/30">{new Date(e.review.created_at).toLocaleDateString('pt-BR')}</span>
                    {e.review.review_text && <p className="line-clamp-4 text-[13px] leading-relaxed text-white/50">{e.review.review_text}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    ),
    lists: () => (
      <section>
        <SectionHeader title="Listas Personalizadas" count={customLists.length} />
        {customLists.length === 0 ? (
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma lista personalizada.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customLists.map(list => (
              <div key={list.id} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg font-bold text-white/80 truncate">{list.name}</h3>
                  <span className="text-xs text-white/40 font-mono">{list.items.length} itens</span>
                </div>
                {list.description && <p className="text-sm text-white/40 line-clamp-2 mb-3">{list.description}</p>}
                <div className="flex gap-1.5 overflow-hidden">
                  {list.items.slice(0, 6).map((item: any) => (
                    <div key={item.id} className="w-12 rounded-md overflow-hidden flex-shrink-0" style={{aspectRatio: '2/3'}}>
                      {item.media_item?.cover_image_url ? (
                        <img src={item.media_item.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs" style={{background: (TYPE_META[item.media_item?.media_type]?.color || '#666') + '22'}}>
                          {TYPE_META[item.media_item?.media_type]?.emoji || '📄'}
                        </div>
                      )}
                    </div>
                  ))}
                  {list.items.length > 6 && (
                    <div className="w-12 rounded-md flex items-center justify-center flex-shrink-0 text-xs text-white/40" style={{background: 'var(--bg-elevated)', aspectRatio: '2/3'}}>
                      +{list.items.length - 6}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    ),
    diary: () => (
      <section>
        <SectionHeader title="Atividades" count={logs.length} />
        {logs.length === 0 ? (
          <div className="mdf-card p-6 text-center text-white/30 text-sm">Nenhuma atividade registrada.</div>
        ) : (
          <div className="space-y-2">
            {[...logs].sort((a, b) => new Date(b.log_date || b.id).getTime() - new Date(a.log_date || a.id).getTime()).slice(0, 50).map(log => {
              const meta = TYPE_META[log.media_item.media_type];
              return (
                <Link key={log.id} to={getLogUrl(log.media_item)} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {log.media_item.cover_image_url ? (
                    <img src={log.media_item.cover_image_url} alt="" className="h-14 w-10 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="h-14 w-10 rounded-lg flex items-center justify-center text-sm" style={{ background: (meta?.color || '#666') + '22' }}>{meta?.emoji || '📄'}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/80 truncate">{log.media_item.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <span>{new Date(log.log_date).toLocaleDateString('pt-BR')}</span>
                      {log.status && <span className="capitalize">{log.status.replace('_', ' ')}</span>}
                    </div>
                  </div>
                  {log.rating != null && log.rating > 0 && (
                    <div className="flex items-center gap-0.5">{getStars(log.rating).map((star, i) => (
                      <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={star === 'full' || star === 'half' ? 'var(--mdf-yellow)' : 'none'} stroke="var(--mdf-yellow)" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>))}</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    ),
  };

  const getActiveTab = () => {
    const viewToTab: Record<string, string> = {
      reviews: 'reviews',
      lists: 'listas',
      diary: 'atividades',
      games: 'jogos',
      movies: 'filmes',
      tvshows: 'series',
      books: 'livros',
    };
    if (view && viewToTab[view]) return viewToTab[view];
    return 'perfil';
  };

  const isMediaTypeView = view && ['games', 'movies', 'tvshows', 'books'].includes(view);

  return (
    <div className="flex flex-col gap-4 lg:gap-10">
      {!isMediaTypeView && (
        <div className="-mx-4 lg:mx-0">
          <ProfileHero
          profileUser={profileUser}
          currentUser={currentUser}
          logs={logs}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowToggle={handleFollowToggle}
          accentColor={accentColor}
          activeTab={getActiveTab()}
          onEditLayout={isOwnProfile ? () => setEditingLayout(true) : undefined}
        />
        </div>
      )}

      {!view ? (
        <>
          {effectiveSections.map(section => {
            if (!section.visible) return null;
            const renderer = sectionRenderers[section.id];
            if (!renderer) return null;
            return <div key={section.id}>{renderer()}</div>;
          })}

          <div className="lg:hidden">
            <BadgesSection userId={profileUser.id} title="Medalhas" />
          </div>

          {editingLayout && (
            <LayoutEditorModal
              sections={effectiveSections}
              availableSections={PROFILE_SECTIONS}
              onSave={handleSaveLayout}
              onClose={() => setEditingLayout(false)}
            />
          )}
        </>
      ) : isMediaTypeView ? (
        <MediaTypeProfilePage key={view} currentUser={currentUser} mediaType={view} profileUser={profileUser} logs={logs} customLists={customLists} topListItems={topListItems} />
      ) : (
        <div key={view}>
          {viewRenderers[view]?.()}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
