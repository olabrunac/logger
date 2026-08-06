import { Link } from 'react-router-dom';
import { Settings2, Library, CheckCircle2, Star, Heart, Clock } from 'lucide-react';
import type { User, LogEntry } from '../types';
import { imageUrl, bannerPosition } from '../utils';

const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  PT: 'Portugal',
  ES: 'Espanha',
  FR: 'França',
  DE: 'Alemanha',
  IT: 'Itália',
  JP: 'Japão',
  AR: 'Argentina',
  MX: 'México',
  CA: 'Canadá',
};

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

const ProfileHero = ({
  profileUser,
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
  const bannerUrl = imageUrl(profileUser.banner_url);
  const avatarUrl = imageUrl(profileUser.avatar_url);

  const bannerPos = bannerPosition(profileUser.banner_position);

  const displayName = profileUser.display_name || profileUser.username;
  const bio = profileUser.bio || '';

  const countryCode = profileUser.country || '';
  const countryName = countryCode ? COUNTRY_NAMES[countryCode] : '';
  const stateCode = profileUser.state || '';
  const showLocation = Boolean(countryCode || stateCode);
  const locationText = [countryName, stateCode].filter(Boolean).join(' - ');

  const totalLogs = logs.length;
  const finishedCount = logs.filter(l => l.status === 'completed').length;
  const ratedCount = logs.filter(l => l.rating != null && l.rating > 0).length;
  const favoriteCount = logs.filter(l => l.is_favorite).length;
  const totalHours = logs.reduce((sum, l) => sum + (l.hours_spent || 0), 0);

  const tabCounts: Record<string, number> = {};
  const activeMediaTypes = logs.filter(l => l.status === 'completed' || l.status === 'in_progress' || l.status === 'dropped');
  activeMediaTypes.forEach(l => {
    const key = l.media_item.media_type;
    tabCounts[key] = (tabCounts[key] || 0) + 1;
  });

const tabs = [
  { id: 'perfil', label: 'Perfil', href: `/profile/${profileUser.username}` },
  { id: 'jogos', label: `Jogos${tabCounts.game != null ? ` (${tabCounts.game})` : ''}`, href: `/profile/${profileUser.username}?view=games` },
  { id: 'filmes', label: `Filmes${tabCounts.movie != null ? ` (${tabCounts.movie})` : ''}`, href: `/profile/${profileUser.username}?view=movies` },
  { id: 'series', label: `Séries${tabCounts.series != null ? ` (${tabCounts.series})` : ''}`, href: `/profile/${profileUser.username}?view=tvshows` },
  { id: 'livros', label: `Livros${tabCounts.book != null ? ` (${tabCounts.book})` : ''}`, href: `/profile/${profileUser.username}?view=books` },
  { id: 'reviews', label: 'Reviews', href: `/profile/${profileUser.username}?view=reviews` },
  { id: 'listas', label: 'Listas', href: `/profile/${profileUser.username}?view=lists` },
  { id: 'atividades', label: 'Atividades', href: `/profile/${profileUser.username}?view=diary` },
];

  return (
    <div className="relative">
      <div
        className="h-[140px] md:h-72 rounded-b-2xl overflow-hidden relative border-b border-white/5"
        style={bannerUrl ? {
          backgroundImage: `url(${bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: bannerPos,
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
              className="w-[88px] h-[88px] md:w-56 md:h-56 rounded-full overflow-hidden border-4 flex-shrink-0 ring-2"
              style={{
                borderColor: 'var(--mdf-bg)',
                background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${accentColor}, #a855f7)`,
                boxShadow: `0 0 20px ${accentColor}44`,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={profileUser.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-2xl md:text-6xl font-black text-white/60">
                  {profileUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                  <h1 className="font-display text-2xl md:text-4xl font-black tracking-tight text-white">
                    {displayName}
                  </h1>
                  <span className="text-sm md:text-base text-white/50">@{profileUser.username}</span>
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

            {(bio || showLocation) && (
              <div className="flex items-start gap-3 mt-3 max-w-2xl">
                {showLocation && (
                  <span className="flex items-center gap-1.5 text-sm text-white/50 shrink-0">
                    {countryCode && (
                      <img
                        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                        alt={countryName}
                        loading="lazy"
                        className="h-2 w-auto shrink-0 rounded-[1px] shadow-sm"
                      />
                    )}
                    {locationText}
                  </span>
                )}
                {bio && showLocation && <div className="w-px self-stretch bg-white/10" />}
                {bio && <p className="text-sm text-white/60 leading-relaxed flex-1">{bio}</p>}
              </div>
            )}

            <div className="flex items-center justify-center md:justify-start gap-5 mt-4 text-xs text-white/50 lg:hidden">
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-white tabular-nums">{activeMediaTypes.length}</span>
                Títulos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-white tabular-nums">{profileUser.following_count ?? 0}</span>
                Seguindo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-white tabular-nums">{profileUser.followers_count ?? 0}</span>
                Seguidores
              </span>
            </div>

            <div className="hidden lg:flex items-center justify-center md:justify-start gap-3 mt-4 text-center md:text-left">
              <Link to={`/profile/${profileUser.username}`}
                className="flex flex-col items-center md:items-start group min-w-[50px]">
                <span className="font-display text-lg md:text-xl font-black text-white">{profileUser.following_count ?? 0}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">Seguindo</span>
              </Link>
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
          </div>
        </div>
      </div>

      <div className="flex justify-around px-4 py-3 border-t border-white/5 lg:hidden">
        {[
          { icon: <Library size={14} />, value: activeMediaTypes.length, label: 'Títulos', href: `/profile/${profileUser.username}?view=games` },
          { icon: <CheckCircle2 size={14} />, value: finishedCount, label: 'Finalizados' },
          { icon: <Star size={14} />, value: ratedCount, label: 'Avaliados' },
          { icon: <Heart size={14} />, value: favoriteCount, label: 'Favoritos' },
          { icon: <Clock size={14} />, value: Math.round(totalHours), label: 'Horas', suffix: 'h' },
        ].map(s => (
          s.href ? (
            <Link key={s.label} to={s.href} className="flex flex-col items-center gap-0.5">
              <span style={{ color: accentColor }}>{s.icon}</span>
              <span className="text-sm font-bold tabular-nums text-white">{s.value}{s.suffix || ''}</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40">{s.label}</span>
            </Link>
          ) : (
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <span style={{ color: accentColor }}>{s.icon}</span>
              <span className="text-sm font-bold tabular-nums text-white">{s.value}{s.suffix || ''}</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40">{s.label}</span>
            </div>
          )
        ))}
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
