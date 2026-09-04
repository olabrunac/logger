import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { resolveUserByUsername } from '../services/api';
import type { LogEntry, User } from '../types';
import YgpCard from '../components/sections/YgpCard';
import SectionHeader from '../components/sections/SectionHeader';
import { TYPE_META } from '../constants/designSystem';
import { ArrowLeft, ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { parseServerDate } from '../utils';

interface StatusDirectoryPageProps {
  currentUser: User;
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em Progresso',
  completed: 'Finalizados',
  wishlist: 'Lista de Desejos',
  library: 'Biblioteca',
  dropped: 'Abandonados',
  platinated: 'Platinados',
  soon: 'Em breve',
  all: 'Todos',
};

type SortMode = 'recent' | 'alpha' | 'media' | 'status';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { mode: SortMode; dir?: SortDir; label: string }[] = [
  { mode: 'recent', dir: 'desc', label: 'Recentes primeiro' },
  { mode: 'recent', dir: 'asc', label: 'Mais antigos primeiro' },
  { mode: 'alpha', dir: 'asc', label: 'Alfabética (A-Z)' },
  { mode: 'alpha', dir: 'desc', label: 'Alfabética (Z-A)' },
  { mode: 'media', label: 'Agrupado por mídia' },
  { mode: 'status', label: 'Agrupado por status' },
];

const MEDIA_ORDER = ['game', 'movie', 'series', 'book'];

const MEDIA_TYPE_MAP: Record<string, string> = {
  games: 'game',
  movies: 'movie',
  tvshows: 'series',
  books: 'book',
  all: 'all',
};

const titleOf = (l: LogEntry) => l.media_item?.title || '';
const isDated = (l: LogEntry) => !!l.log_date && l.status !== 'wishlist' && l.status !== 'soon';
const dateOf = (l: LogEntry) => (l.log_date ? parseServerDate(l.log_date).getTime() : 0);

const makeRecentCmp = (dir: SortDir) => (a: LogEntry, b: LogEntry) => {
  const aDated = isDated(a);
  const bDated = isDated(b);
  if (aDated !== bDated) return aDated ? -1 : 1;
  const diff = dateOf(b) - dateOf(a);
  if (diff !== 0) return diff * (dir === 'desc' ? 1 : -1);
  return b.id - a.id;
};

const makeAlphaCmp = (dir: SortDir) => (a: LogEntry, b: LogEntry) => {
  const c = titleOf(a).localeCompare(titleOf(b), 'pt-BR', { sensitivity: 'base', numeric: true });
  if (c !== 0) return c * (dir === 'asc' ? 1 : -1);
  return b.id - a.id;
};

const StatusDirectoryPage = ({ currentUser }: StatusDirectoryPageProps) => {
  const { username, status, mediaType } = useParams<{ username: string; status: string; mediaType: string }>();
  const statusKey = status && STATUS_LABELS[status] ? status : 'library';
  const mediaTypeKey = mediaType && MEDIA_TYPE_MAP[mediaType] ? mediaType : 'all';
  const mediaTypeVal = MEDIA_TYPE_MAP[mediaTypeKey];
  const meta = mediaTypeVal !== 'all' ? TYPE_META[mediaTypeVal] : null;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [onlyShared, setOnlyShared] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      let target = currentUser;
      if (username && username !== currentUser.username) {
        target = await resolveUserByUsername(username);
      }
      if (requestId !== fetchIdRef.current) return;
      setTargetUser(target);
      const [logsRes, wishlistRes] = await Promise.all([
        api.get('/media/logs', { params: { user_id: target.id, limit: 9999, light: true } }),
        api.get('/media/wishlist', { params: { user_id: target.id } }),
      ]);
      if (requestId !== fetchIdRef.current) return;
      setLogs([...(logsRes.data || []), ...(wishlistRes.data || [])]);
    } catch (err) {
      if (requestId !== fetchIdRef.current) return;
      console.error('Failed to fetch directory data', err);
      setError('Perfil não encontrado');
    } finally {
      if (requestId === fetchIdRef.current) setLoading(false);
    }
  }, [username, currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isOwnProfile = targetUser?.id === currentUser.id;

  const [sortMode, setSortMode] = useState<SortMode>(() =>
    statusKey === 'library' || statusKey === 'all' ? 'alpha' : 'recent',
  );
  const [sortDir, setSortDir] = useState<SortDir>(() =>
    statusKey === 'library' || statusKey === 'all' ? 'asc' : 'desc',
  );
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSortMode(statusKey === 'library' || statusKey === 'all' ? 'alpha' : 'recent');
    setSortDir(statusKey === 'library' || statusKey === 'all' ? 'asc' : 'desc');
  }, [statusKey]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => logs.filter(l => {
    const mediaOk = mediaTypeVal === 'all' || l.media_item?.media_type === mediaTypeVal;
    if (!mediaOk) return false;
    let statusOk: boolean;
    if (statusKey === 'all') {
      statusOk = true;
    } else if (statusKey === 'library') {
      statusOk = l.media_item?.media_type === 'game'
        ? (l.status !== 'wishlist' && l.status !== 'soon')
        : l.status === 'library';
    } else if (statusKey === 'completed') {
      statusOk = l.status === 'completed' || l.status === 'platinated';
    } else {
      statusOk = l.status === statusKey;
    }
    return statusOk && (!onlyShared || l.family_share);
  }), [logs, statusKey, mediaTypeVal, onlyShared]);

  const items = useMemo(() => {
    if (sortMode === 'media' || sortMode === 'status') return filtered;
    const list = [...filtered];
    list.sort(sortMode === 'alpha' ? makeAlphaCmp(sortDir) : makeRecentCmp(sortDir));
    return list;
  }, [filtered, sortMode, sortDir]);

  const groups = useMemo(() => {
    if (sortMode !== 'media' && sortMode !== 'status') return [];
    const keys = sortMode === 'media' ? MEDIA_ORDER : ['in_progress', 'completed', 'dropped', 'wishlist', 'soon', 'platinated', 'library'];
    const keyOf = (l: LogEntry) => (sortMode === 'media' ? l.media_item?.media_type : l.status);
    const cmp = makeRecentCmp('desc');
    return keys
      .map(key => {
        const groupItems = filtered.filter(l => keyOf(l) === key);
        if (groupItems.length === 0) return null;
        return {
          key,
          label: sortMode === 'media' ? TYPE_META[key]?.label : STATUS_LABELS[key] || key,
          items: groupItems.sort(cmp),
        };
      })
      .filter(Boolean) as { key: string; label: string; items: LogEntry[] }[];
  }, [filtered, sortMode]);

  const activeSort = SORT_OPTIONS.find(o => o.mode === sortMode && (o.dir === undefined || o.dir === sortDir));

  const title = STATUS_LABELS[statusKey];
  const displayTitle = meta ? `${title} · ${meta.label}` : title;
  const profileUsername = targetUser?.username || username || currentUser.username;

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1844px] mx-auto">
        <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
      </div>
    );
  }

  if (error || !targetUser) {
    return (
      <div className="space-y-6 max-w-[1844px] mx-auto">
        <div className="mdf-card p-8 text-center text-white/50">
          <h3 className="text-white mb-2">{error || 'Perfil não encontrado'}</h3>
          <Link to="/" className="mdf-btn-primary">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  if (!isOwnProfile && targetUser.profile_public === false) {
    return (
      <div className="space-y-6 max-w-[1844px] mx-auto">
        <div className="mdf-card p-8 text-center text-white/50">
          <h3 className="text-white mb-2">Este perfil é privado</h3>
          <p className="text-sm">@{targetUser.username} não tornou o perfil público.</p>
        </div>
      </div>
    );
  }

  if (statusKey === 'library' && !isOwnProfile && !(targetUser.show_game_library ?? true)) {
    return (
      <div className="space-y-6 max-w-[1844px] mx-auto">
        <div className="mdf-card p-8 text-center text-white/50">
          <h3 className="text-white mb-2">Biblioteca privada</h3>
          <p className="text-sm">@{targetUser.username} optou por não exibir a biblioteca.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1844px] mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/profile/${profileUsername}`}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 flex-shrink-0"
            style={{ color: 'var(--accent)' }}
          >
            <ArrowLeft size={14} />
            Voltar
          </Link>
          <h1 className="hidden lg:block font-display text-3xl font-black tracking-tight truncate">
            {displayTitle}
            <span className="text-white/40 text-xl ml-2">({items.length})</span>
          </h1>
        </div>
        <div className="lg:hidden font-display text-lg font-black tracking-tight truncate">
          {displayTitle}
          <span className="text-white/40 text-sm ml-1">({items.length})</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              title="Ordenação"
            >
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{activeSort?.label || 'Ordenar'}</span>
              <ChevronDown size={13} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 mdf-card overflow-hidden z-50" style={{ animation: 'slideDown 0.15s ease' }}>
                {SORT_OPTIONS.map(opt => {
                  const isActive = opt.mode === sortMode && (opt.dir === undefined || opt.dir === sortDir);
                  return (
                    <button
                      key={`${opt.mode}-${opt.dir || ''}`}
                      onClick={() => {
                        setSortMode(opt.mode);
                        if (opt.dir !== undefined) setSortDir(opt.dir);
                        setSortOpen(false);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2"
                      style={isActive ? { color: 'var(--accent)' } : { color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {opt.label}
                      {isActive && <Check size={14} style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => setOnlyShared(v => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
            style={onlyShared
              ? { background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.35)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Compartilhados
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mdf-card p-10 text-center text-white/50">Nenhum item nesta lista.</div>
      ) : groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map(g => (
            <div key={g.key}>
              <SectionHeader title={g.label} count={g.items.length} />
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {g.items.map(log => (
                  <YgpCard key={log.id} log={log} accentColor={targetUser.accent_color} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {items.map(log => (
            <YgpCard key={log.id} log={log} accentColor={targetUser.accent_color} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusDirectoryPage;
