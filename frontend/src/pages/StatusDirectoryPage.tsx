import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { resolveUserByUsername } from '../services/api';
import type { LogEntry, User } from '../types';
import YgpCard from '../components/sections/YgpCard';
import { TYPE_META } from '../constants/designSystem';
import { ArrowLeft } from 'lucide-react';

interface StatusDirectoryPageProps {
  currentUser: User;
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em Progresso',
  completed: 'Finalizados',
  wishlist: 'Lista de Desejos',
  library: 'Biblioteca',
  dropped: 'Abandonados',
  all: 'Todos',
};

const MEDIA_TYPE_MAP: Record<string, string> = {
  games: 'game',
  movies: 'movie',
  tvshows: 'series',
  books: 'book',
  all: 'all',
};

const sortLogs = (logs: LogEntry[], statusKey: string) => {
  const list = [...logs];
  if (statusKey === 'library' || statusKey === 'all') {
    list.sort((a, b) => (a.media_item?.title || '').localeCompare(b.media_item?.title || '', 'pt-BR', { sensitivity: 'base', numeric: true }));
  } else {
    list.sort((a, b) => b.id - a.id);
  }
  return list;
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let target = currentUser;
      if (username && username !== currentUser.username) {
        target = await resolveUserByUsername(username);
      }
      setTargetUser(target);
      const [logsRes, wishlistRes] = await Promise.all([
        api.get('/media/logs', { params: { user_id: target.id, limit: 500 } }),
        api.get('/media/wishlist', { params: { user_id: target.id } }),
      ]);
      setLogs([...(logsRes.data || []), ...(wishlistRes.data || [])]);
    } catch (err) {
      console.error('Failed to fetch directory data', err);
      setError('Perfil não encontrado');
    } finally {
      setLoading(false);
    }
  }, [username, currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isOwnProfile = targetUser?.id === currentUser.id;

  const filtered = logs.filter(l =>
    (statusKey === 'all' || l.status === statusKey) &&
    (mediaTypeVal === 'all' || l.media_item?.media_type === mediaTypeVal) &&
    (!onlyShared || l.family_share),
  );
  const items = sortLogs(filtered, statusKey);

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
        <button
          onClick={() => setOnlyShared(v => !v)}
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          style={onlyShared
            ? { background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.35)' }
            : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          Compartilhados
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mdf-card p-10 text-center text-white/50">Nenhum item nesta lista.</div>
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
