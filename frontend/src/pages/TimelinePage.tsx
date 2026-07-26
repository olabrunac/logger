import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import { getStars, TYPE_META, STATUS_COLORS, STATUS_ICONS } from '../constants/designSystem';
import { Clock, Heart } from 'lucide-react';

interface TimelinePageProps {
  user: User;
}

interface TimelineEntry {
  id: number;
  user: { id: number; username: string; avatar_url?: string } | null;
  media_item: { id: number; title: string; media_type: string; cover_image_url?: string } | null;
  status: string | null;
  rating: number | null;
  review: string | null;
  platform: string | null;
  log_date: string | null;
  is_favorite: boolean | null;
  hours_spent: number | null;
}

const statusLabels: Record<string, string> = {
  completed: 'finalizou',
  in_progress: 'esta jogando',
  dropped: 'abandonou',
  wishlist: 'quer jogar',
};

const TimelinePage = ({ user }: TimelinePageProps) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${user.id}/timeline`)
      .then(res => setEntries(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  const getAvatarUrl = (url?: string) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://localhost:8000${url}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-black tracking-tight">Timeline</h1>
        <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight">Timeline</h1>
        <div className="text-white/50 text-sm mt-1">Atividades dos usuarios que voce segue</div>
      </div>

      {entries.length === 0 ? (
        <div className="mdf-card p-12 text-center">
          <Clock size={48} className="mx-auto mb-4 text-white/20" />
          <h3 className="font-display text-xl font-bold text-white/60 mb-2">Nenhuma atividade</h3>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Siga outros usuarios para ver o que estao assistindo, jogando e lendo aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            if (!entry.user || !entry.media_item) return null;
            const meta = TYPE_META[entry.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
            const avatarUrl = getAvatarUrl(entry.user.avatar_url);
            const coverUrl = entry.media_item.cover_image_url
              ? entry.media_item.cover_image_url.startsWith('http')
                ? entry.media_item.cover_image_url
                : `http://localhost:8000${entry.media_item.cover_image_url}`
              : null;
            const statusLabel = entry.status ? statusLabels[entry.status] || entry.status : null;

            return (
              <Link key={entry.id} to={`/log/${entry.id}`} className="mdf-card mdf-card-hover rounded-xl p-4 flex gap-4 transition-colors block group">
                {/* User avatar */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* User + action */}
                  <div className="flex items-center gap-1.5 text-sm mb-2">
                    <span className="font-bold text-white">{entry.user.username}</span>
                    <span className="text-white/40">{statusLabel || 'registrou'}</span>
                    <span className="text-white/40">{meta.emoji}</span>
                  </div>

                  {/* Media card */}
                  <div className="flex gap-3 items-start">
                    {coverUrl ? (
                      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ borderBottom: '2px solid ' + meta.color }}>
                        <img src={coverUrl} alt={entry.media_item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-20 rounded-lg flex items-center justify-center flex-shrink-0 text-xl" style={{ background: meta.color + '22', borderBottom: '2px solid ' + meta.color }}>
                        {meta.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white/80 truncate">{entry.media_item.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.status && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: STATUS_COLORS[entry.status] || 'rgba(100,100,100,0.85)' }}>
                            {STATUS_ICONS[entry.status]} {entry.status === 'completed' ? 'Finalizado' : entry.status === 'in_progress' ? 'Em progresso' : entry.status === 'dropped' ? 'Abandonado' : entry.status}
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

                  {/* Footer */}
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
          })}
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
