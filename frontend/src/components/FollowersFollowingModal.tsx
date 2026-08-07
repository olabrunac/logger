import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../services/api';
import { imageUrl } from '../utils';

interface FollowUser {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  accent_color?: string;
}

interface FollowersFollowingModalProps {
  userId: number;
  username: string;
  initialTab: 'followers' | 'following';
  onClose: () => void;
}

const TABS: Array<{ id: 'followers' | 'following'; label: string }> = [
  { id: 'followers', label: 'Seguidores' },
  { id: 'following', label: 'Seguindo' },
];

const FollowersFollowingModal = ({ userId, username, initialTab, onClose }: FollowersFollowingModalProps) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/users/${userId}/${activeTab}`)
      .then((res) => { if (!cancelled) setUsers(res.data || []); })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-display text-base font-bold text-white">@{username}</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/10 text-white/40 hover:text-white/80">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{
                background: activeTab === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {tab.label}{!loading && activeTab === tab.id && users.length > 0 ? ` (${users.length})` : ''}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-white/40">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/40">Nenhum usuário.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {users.map(u => (
                <Link
                  key={u.id}
                  to={`/profile/${u.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border"
                    style={{ borderColor: 'var(--border)', background: u.accent_color || 'var(--accent)' }}
                  >
                    {u.avatar_url && imageUrl(u.avatar_url) ? (
                      <img src={imageUrl(u.avatar_url)!} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: '#000' }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.display_name || u.username}</p>
                    <p className="text-xs text-white/40 truncate">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersFollowingModal;
