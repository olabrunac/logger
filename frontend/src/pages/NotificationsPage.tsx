import { useEffect, useState, useCallback, type ComponentType } from 'react';
import {
  Bell, Heart, MessageCircle, UserPlus, Trophy, CheckCheck,
  Wrench, Film, Tv, Gamepad2, BookOpen, Star, Flame, Users,
} from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import type { AppNotification } from '../types';
import { parseServerDate } from '../utils';

const ICON_MAP: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Wrench, Film, Tv, Gamepad2, BookOpen, Trophy, Star, Flame, Users, UserPlus,
};

const RARITY_HEX: Record<string, string> = {
  bronze: "#CD7F32", prata: "#C0C0C0", ouro: "#F5C518", diamante: "#3B82F6",
  lendario: "#A85FEB", imortal: "#EF4444", arcano: "#22C55E", celestial: "#06B6D4", cosmico: "#EC4899",
};

const RARITY_LABELS: Record<string, string> = {
  bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante",
  lendario: "Lendário", imortal: "Imortal", arcano: "Arcano", celestial: "Celestial", cosmico: "Cósmico",
};

const TYPE_CONFIG: Record<string, {
  icon: typeof Heart;
  bgClass: string;
  color: string;
  getTitle: (n: AppNotification) => string;
  getDesc: (n: AppNotification) => string;
}> = {
  like: {
    icon: Heart, bgClass: 'rgba(239,68,68,0.1)', color: '#ef4444',
    getTitle: () => 'Curtida',
    getDesc: (n) => n.post_content
      ? `${n.from_username || 'Alguém'} curtiu seu post: "${n.post_content}${n.post_content.length >= 150 ? '...' : ''}"`
      : `${n.from_username || 'Alguém'} curtiu seu post`,
  },
  reply: {
    icon: MessageCircle, bgClass: 'rgba(59,130,246,0.1)', color: '#3b82f6',
    getTitle: () => 'Resposta',
    getDesc: (n) => n.reply_content
      ? `${n.from_username || 'Alguém'} respondeu: "${n.reply_content}${n.reply_content.length >= 150 ? '...' : ''}"`
      : `${n.from_username || 'Alguém'} respondeu seu post`,
  },
  follow: {
    icon: UserPlus, bgClass: 'rgba(168,85,247,0.1)', color: '#a855f7',
    getTitle: () => 'Novo Seguidor',
    getDesc: (n) => `${n.from_username || 'Alguém'} começou a seguir você`,
  },
  badge: {
    icon: Trophy, bgClass: 'rgba(245,197,24,0.1)', color: '#f5c518',
    getTitle: () => 'Badge Evoluiu!',
    getDesc: (n) => {
      const name = n.badge_title || 'Explorador';
      const rarity = n.badge_rarity ? RARITY_LABELS[n.badge_rarity] || n.badge_rarity : '';
      const milestone = n.badge_description ? ` (${n.badge_description})` : '';
      return `Seu badge ${name} evoluiu para ${rarity}${milestone}`;
    },
  },
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - parseServerDate(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}sem`;
};

interface NotificationsPageProps {
  user: { id: number; username: string };
  onNotificationsRead?: () => void;
}

const NotificationsPage = ({ user, onNotificationsRead }: NotificationsPageProps) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const r = await getNotifications(user.id);
      setNotifications(r.data || []);
    } catch { }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onNotificationsRead?.();
    } catch { }
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id, user.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        onNotificationsRead?.();
      } catch { }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="mdf-card p-8 text-center text-white/50">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-[1844px] mx-auto">
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-black tracking-tight">Notificacoes</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: '#ef4444', color: '#fff' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button onClick={handleMarkAllRead} disabled={unreadCount === 0} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <CheckCheck size={14} />
          <span>Marcar tudo como lido</span>
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="mdf-card p-12 text-center">
          <Bell size={32} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm text-white/40">Nenhuma notificacao ainda</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type];
            if (!cfg) return null;
            const Icon = n.type === 'badge' && n.badge_icon && ICON_MAP[n.badge_icon]
              ? (ICON_MAP[n.badge_icon] as any)
              : cfg.icon;
            const bg = n.type === 'badge' ? (RARITY_HEX[n.badge_rarity || ''] || cfg.color) : cfg.color;

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`relative flex w-full cursor-pointer items-start gap-3 px-4 py-3 lg:px-10 transition-opacity duration-300 ${n.read ? 'opacity-40' : 'bg-transparent hover:bg-white/[0.03]'}`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cfg.color}22` }}>
                  <Icon size={16} style={{ color: cfg.color === bg ? cfg.color : bg }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{cfg.getTitle(n)}</p>
                  <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-xs text-placeholder">{cfg.getDesc(n)}</p>
                  <p className="mt-1 text-xs text-placeholder">{timeAgo(n.created_at)}</p>
                </div>
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-2 top-4 h-2 w-2 rounded-full bg-primary transition-all duration-300 ease-out lg:right-3 ${n.read ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
