import { Link } from 'react-router-dom';
import { Globe, Calendar, Settings2 } from 'lucide-react';
import type { User, LogEntry } from '../types';

interface ProfileHeroProps {
  profileUser: User;
  currentUser: User;
  logs: LogEntry[];
  isOwnProfile: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onFollowToggle: () => void;
  accentColor: string;
  activeTab?: string;
  activeMediaType?: string;
  onEditLayout?: () => void;
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
  x: { label: 'X', icon: '𝕏' },
  instagram: { label: 'Instagram', icon: '📷' },
  discord: { label: 'Discord', icon: '💬' },
  youtube: { label: 'YouTube', icon: '▶️' },
  twitch: { label: 'Twitch', icon: '🔴' },
  kick: { label: 'Kick', icon: '👟' },
  spotify: { label: 'Spotify', icon: '🎵' },
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const ProfileHero = ({
  profileUser,
  currentUser,
  logs,
  isOwnProfile,
  isFollowing,
  followLoading,
  onFollowToggle,
  accentColor,
  activeTab,
  activeMediaType,
  onEditLayout,
}: ProfileHeroProps) => {
  const bannerUrl = profileUser.banner_url
    ? (profileUser.banner_url.startsWith('http') ? profileUser.banner_url : `http://localhost:8000${profileUser.banner_url}`)
    : null;

  const avatarUrl = profileUser.avatar_url
    ? (profileUser.avatar_url.startsWith('http') ? profileUser.avatar_url : `http://localhost:8000${profileUser.avatar_url}`)
    : null;

  let socialData: { platforms?: Record<string, string>; spotify?: string; custom?: Array<{ label: string; url: string }> } = {};
  try { socialData = JSON.parse(profileUser.social_links || '{}'); } catch {}

  const platformLinks = socialData.platforms || {};
  const customLinks = socialData.custom || [];
  const spotifyUrl = socialData.spotify || '';

  const activePlatforms = Object.entries(platformLinks).filter(([, v]) => v);

  const displayName = profileUser.display_name || profileUser.username;
  const bio = profileUser.bio || '';

  const totalLogs = logs.length;
  const finishedCount = logs.filter(l => l.status === 'completed').length;
  const ratedCount = logs.filter(l => l.rating != null && l.rating > 0).length;
  const favoriteCount = logs.filter(l => l.is_favorite).length;
  const totalHours = logs.reduce((sum, l) => sum + (l.hours_spent || 0), 0);

const tabs = [
  { id: 'perfil', label: 'Perfil', href: `/profile/${profileUser.username}` },
  { id: 'jogos', label: 'Jogos', href: `/profile/${profileUser.username}?view=games` },
  { id: 'filmes', label: 'Filmes', href: `/profile/${profileUser.username}?view=movies` },
  { id: 'series', label: 'Séries', href: `/profile/${profileUser.username}?view=tvshows` },
  { id: 'livros', label: 'Livros', href: `/profile/${profileUser.username}?view=books` },
  { id: 'reviews', label: 'Reviews', href: `/profile/${profileUser.username}?view=reviews` },
  { id: 'listas', label: 'Listas', href: `/profile/${profileUser.username}?view=lists` },
  { id: 'atividades', label: 'Atividades', href: `/profile/${profileUser.username}?view=diary` },
];

  return (
    <div className="relative">
      <div
        className="h-36 md:h-72 rounded-b-2xl overflow-hidden relative border-b border-white/5"
        style={bannerUrl ? {
          backgroundImage: `url(${bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {
          background: `linear-gradient(135deg, ${accentColor}22 0%, var(--bg-elevated) 50%, var(--bg) 100%)`,
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--mdf-bg), transparent 60%)' }} />
      </div>

      <div className="relative z-10 px-6 -mt-16 md:-mt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-shrink-0 self-center md:self-end">
            <div
              className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 flex-shrink-0 ring-2"
              style={{
                borderColor: 'var(--mdf-bg)',
                background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${accentColor}, #a855f7)`,
                boxShadow: `0 0 20px ${accentColor}44`,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={profileUser.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-3xl font-black text-white/60">
                  {profileUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl md:text-4xl font-black tracking-tight text-white">
                  {displayName}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-0.5">
                  <span className="text-sm text-white/50">@{profileUser.username}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: `${accentColor}22`, color: accentColor }}>
                    Membro
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-end gap-2">
                {isOwnProfile ? (
                  <Link to="/settings" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all"
                    style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                    Editar Perfil
                  </Link>
                ) : (
                  <button
                    onClick={onFollowToggle}
                    disabled={followLoading}
                    className="text-sm font-bold px-5 py-2 rounded-full transition-all"
                    style={isFollowing ? {
                      background: 'transparent',
                      color: accentColor,
                      border: `1px solid ${accentColor}`,
                    } : {
                      background: accentColor,
                      color: '#000',
                      border: '1px solid transparent',
                    }}
                  >
                    {followLoading ? '...' : isFollowing ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
              </div>
            </div>

            {bio && (
              <p className="text-sm text-white/60 mt-3 max-w-2xl leading-relaxed">{bio}</p>
            )}

            <div className="flex items-center justify-center md:justify-start gap-3 mt-3 flex-wrap">
              {activePlatforms.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-white px-2 py-1 rounded-md"
                  style={{ color: 'var(--text-muted)' }} title={PLATFORM_CONFIG[key]?.label || key}>
                  <span className="text-sm">{PLATFORM_CONFIG[key]?.icon || '🔗'}</span>
                  <span className="hidden sm:inline">{PLATFORM_CONFIG[key]?.label || key}</span>
                </a>
              ))}
              {spotifyUrl && (
                <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-white px-2 py-1 rounded-md"
                  style={{ color: 'var(--text-muted)' }} title="Spotify">
                  <span className="text-sm">🎵</span>
                  <span className="hidden sm:inline">Spotify</span>
                </a>
              )}
              {customLinks.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-white px-2 py-1 rounded-md"
                  style={{ color: 'var(--text-muted)' }}>
                  <Globe size={14} />
                  <span className="hidden sm:inline">{link.label}</span>
                </a>
              ))}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3 mt-4 text-center md:text-left">
              <Link to={`/profile/${profileUser.username}`}
                className="flex flex-col items-center md:items-start group min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{profileUser.following_count ?? 0}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">Seguindo</span>
              </Link>
              <div className="w-px h-10 bg-white/10" />
              <Link to={`/profile/${profileUser.username}`}
                className="flex flex-col items-center md:items-start group min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{profileUser.followers_count ?? 0}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">Seguidores</span>
              </Link>
              <div className="w-px h-10 bg-white/10 mx-1" />
              <Link to={`/profile/${profileUser.username}`}
                className="flex flex-col items-center md:items-start group min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{totalLogs}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">Registros</span>
              </Link>
              <div className="flex flex-col items-center md:items-start min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{finishedCount}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Finalizados</span>
              </div>
              <div className="flex flex-col items-center md:items-start min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{ratedCount}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Avaliados</span>
              </div>
              <div className="flex flex-col items-center md:items-start min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{favoriteCount}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Favoritos</span>
              </div>
              <div className="flex flex-col items-center md:items-start min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{Math.round(totalHours)}h</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Horas</span>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-1.5 mt-3 text-xs text-white/30">
              <Calendar size={12} />
              <span>Membro desde {formatDate(profileUser.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center overflow-x-auto gap-1 px-6 pt-0 border-b border-white/5">
        {tabs.map(tab => {
          const typeToTab: Record<string, string> = { game: 'jogos', movie: 'filmes', series: 'series', book: 'livros' };
          const effectiveTab = activeTab || typeToTab[activeMediaType || ''] || 'perfil';
          const isActive = tab.id === effectiveTab;
          return (
            <Link
              key={tab.label}
              to={tab.href}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all shrink-0"
              style={{
                color: isActive ? accentColor : 'var(--text-dim)',
                borderBottomColor: isActive ? accentColor : 'transparent',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
        {isOwnProfile && onEditLayout && (
          <button onClick={onEditLayout}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10 text-white/50 hover:text-white/80 shrink-0"
            style={{ border: '1px solid var(--border)' }}>
            <Settings2 size={14} />
            Editar layout
          </button>
        )}
      </div>


    </div>
  );
};

export default ProfileHero;
