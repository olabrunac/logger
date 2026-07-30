import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { getUserCustomLists } from '../services/api';
import type { LogEntry, LogReview, User, TopListItem, CustomList } from '../types';
import ProfileHero from '../components/ProfileHero';
import MediaTypeProfilePage from './MediaTypeProfilePage';
import YgpCard from '../components/sections/YgpCard';
import SectionHeader from '../components/sections/SectionHeader';
import LayoutEditorModal from '../components/sections/LayoutEditorModal';
import { TYPE_META, getStars } from '../constants/designSystem';

interface ProfilePageProps {
  currentUser: User;
}

interface Post {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  images: { id: number; url: string; is_gif: boolean }[];
  replies_count: number;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
}

const IMAGE_URL = (url: string) => url.startsWith('http') ? url : `http://localhost:8000${url}`;

const ProfilePage = ({ currentUser }: ProfilePageProps) => {
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
        setPosts(postsRes.data || []);
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
    const defaultSections: Array<{ id: string; visible: boolean; label: string }> = [
      { id: 'favorite_games', visible: true, label: 'Favoritos' },
      { id: 'recent_games', visible: true, label: 'Atividade recente' },
      { id: 'reviews', visible: true, label: 'Reviews' },
      { id: 'posts', visible: true, label: 'Posts' },
    ];

    if (!sectionConfig) return defaultSections;

    const configMap = new Map(sectionConfig.map(s => [s.id, s.visible]));
    const order = sectionConfig.map(s => s.id);

    const ordered = defaultSections
      .filter(s => order.includes(s.id))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    for (const d of defaultSections) {
      if (!order.includes(d.id)) ordered.push(d);
    }

    return ordered.map(s => ({
      ...s,
      visible: configMap.has(s.id) ? configMap.get(s.id)! : s.visible,
    }));
  }, [sectionConfig]);

  const handleFollowToggle = async () => {
    if (!profileUser || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/users/${currentUser.id}/follow/${profileUser.id}`);
        setIsFollowing(false);
      } else {
        await api.post(`/users/${currentUser.id}/follow/${profileUser.id}`);
        setIsFollowing(true);
      }
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
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {recentLogs.slice(0, 12).map(log => (
            <YgpCard key={log.id} log={log} accentColor={accentColor} />
          ))}
        </div>
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
        <div className="hidden gap-2 lg:flex lg:items-end lg:justify-center">
          {items.map(({ type, items: typeItems }, idx) => {
            const top = typeItems[0];
            const media = top.media_item;
            const meta = TYPE_META[type];
            const isGoat = idx === 0;
            return (
              <div key={type} className="min-w-0" style={{ width: `calc((100% - 24px) / 4)`, maxWidth: `calc((100% - 24px) / 4)` }}>
                <div className={`relative ${isGoat ? '-mt-6' : ''}`}>
                  {isGoat && (
                    <div className="flex justify-center -mb-3 relative z-10">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
                        <path d="M12 16v4"/>
                      </svg>
                    </div>
                  )}
                  <Link to={media ? `/log/${top.id}` : '#'} className={`group relative flex flex-col overflow-hidden rounded-lg transition-opacity hover:opacity-90 ${isGoat ? 'outline outline-2' : ''}`}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      aspectRatio: '3/4',
                      outlineColor: isGoat ? '#F59E0B' : 'transparent',
                      outlineOffset: 0,
                    }}>
                    {media?.cover_image_url ? (
                      <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                        <span className="text-3xl">{meta?.emoji || '📄'}</span>
                        <div className="text-xs text-white/70 font-medium line-clamp-3 mt-2">{media?.title || type}</div>
                      </div>
                    )}
                    <div className="absolute left-1.5 top-1.5">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg" style={{ background: meta?.color || '#666' }}>
                        {meta?.emoji || '?'}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-2.5">
                      <div className="flex h-5 items-center gap-0.5 rounded bg-black/50 px-1.5 text-[10px] font-bold text-white/80 tabular-nums backdrop-blur-sm">
                        #1
                      </div>
                    </div>
                  </Link>
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
            return (
              <Link key={type} to={media ? `/log/${top.id}` : '#'} className="group relative flex flex-col overflow-hidden rounded-lg transition-opacity hover:opacity-90" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', aspectRatio: '3/4' }}>
                {media?.cover_image_url ? (
                  <img src={media.cover_image_url} alt={media.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-3xl">{meta?.emoji || '📄'}</span>
                    <div className="text-xs text-white/70 font-medium line-clamp-3 mt-2">{media?.title || type}</div>
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg" style={{ background: meta?.color || '#666' }}>
                    {meta?.emoji || '?'}
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-2.5">
                  <div className="flex h-5 items-center gap-0.5 rounded bg-black/50 px-1.5 text-[10px] font-bold text-white/80 tabular-nums backdrop-blur-sm">
                    #1 · {meta?.label}
                  </div>
                </div>
              </Link>
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
        <div className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 lg:hidden">
          {reviewEntries.slice(0, 10).map(e => {
            const meta = TYPE_META[e.log.media_item.media_type];
            return (
              <Link key={e.review.id} to={'/log/' + e.log.id} className="flex w-[260px] shrink-0 gap-3 rounded-2xl p-3 transition-colors hover:bg-white/5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {e.log.media_item.cover_image_url ? (
                  <img src={e.log.media_item.cover_image_url} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} loading="lazy" />
                ) : (
                  <div className="h-24 w-16 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
              <Link key={e.review.id} to={'/log/' + e.log.id} className="flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                {e.log.media_item.cover_image_url ? (
                  <img src={e.log.media_item.cover_image_url} alt="" className="h-28 w-[72px] shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} loading="lazy" />
                ) : (
                  <div className="h-28 w-[72px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
    return (
      <section>
        <SectionHeader title="Posts" linkTo="/timeline" count={posts.length} />
        <div className="space-y-2">
          {posts.slice(0, 4).map(post => (
            <div key={post.id} className="mdf-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Link to={`/profile/${post.username}`} className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
                    {post.avatar_url ? (
                      <img src={IMAGE_URL(post.avatar_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                        {post.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 whitespace-pre-wrap break-words line-clamp-3">{post.content}</p>
                  {post.images.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {post.images.slice(0, 3).map(img => (
                        <div key={img.id} className="w-16 h-16 rounded-lg overflow-hidden">
                          <img src={IMAGE_URL(img.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                      {post.images.length > 3 && (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs text-white/40" style={{ background: 'var(--mdf-surface)' }}>
                          +{post.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                    <span>{post.likes_count} curtida{post.likes_count !== 1 ? 's' : ''}</span>
                    <span>{post.replies_count} resposta{post.replies_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const PROFILE_SECTIONS = [
    { id: 'favorite_games', label: 'Favoritos' },
    { id: 'recent_games', label: 'Atividade Recente' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'posts', label: 'Posts' },
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
  };

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
                <Link key={e.review.id} to={'/log/' + e.log.id} className="flex gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {e.log.media_item.cover_image_url ? (
                    <img src={e.log.media_item.cover_image_url} alt="" className="h-28 w-[72px] shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} loading="lazy" />
                  ) : (
                    <div className="h-28 w-[72px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
                  {list.items.slice(0, 8).map((item: any) => (
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
                <Link key={log.id} to={'/log/' + log.id} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
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
    <div className="space-y-10">
      {!isMediaTypeView && (
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
      )}

      {!view ? (
        <>
          {effectiveSections.map(section => {
            if (!section.visible) return null;
            const renderer = sectionRenderers[section.id];
            if (!renderer) return null;
            return <div key={section.id}>{renderer()}</div>;
          })}

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
