import { useEffect, useState, useRef, useCallback, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Wrench, Film, Tv, Gamepad2, BookOpen, Trophy, Star, Flame,
  Users, UserPlus, MessageCircle, Target, Award, Heart, Compass, Clock,
} from 'lucide-react';
import { getUserBadges } from '../../services/api';
import type { UserBadge, BadgeResponse } from '../../types';

interface BadgesSectionProps {
  userId: number;
}

const ICON_MAP: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Wrench, Film, Tv, Gamepad2, BookOpen, Trophy, Star, Flame,
  Users, UserPlus, MessageCircle, Target, Award, Heart, Compass, Clock,
};

const RARITY_LABELS: Record<string, string> = {
  bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante",
  lendario: "Lendário", imortal: "Imortal", arcano: "Arcano", celestial: "Celestial", cosmico: "Cósmico",
};

const RARITY_HEX: Record<string, string> = {
  bronze: "#CD7F32", prata: "#C0C0C0", ouro: "#F5C518", diamante: "#3B82F6",
  lendario: "#A85FEB", imortal: "#EF4444", arcano: "#22C55E", celestial: "#06B6D4", cosmico: "#EC4899",
};

const RARITY_ORDER: Record<string, number> = {
  bronze: 0, prata: 1, ouro: 2, diamante: 3, lendario: 4, imortal: 5, arcano: 6, celestial: 7, cosmico: 8,
};

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const BadgeIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const Icon = ICON_MAP[name];
  if (!Icon) return <span className={className}>?</span>;
  return <Icon className={className} style={style} />;
};

interface BadgeItemProps {
  icon: string;
  title: string;
  rarity: string;
  description?: string;
  isUnlocked: boolean;
  badgeCount?: number;
  progressCurrent?: number;
  progressTarget?: number;
}

const BadgeItem = ({ icon, title, rarity, description, isUnlocked, badgeCount, progressCurrent, progressTarget }: BadgeItemProps) => {
  const hex = isUnlocked ? (RARITY_HEX[rarity] || RARITY_HEX.bronze) : "#3F4555";
  const rgb = hexToRgb(hex);
  const rarityLabel = RARITY_LABELS[rarity] || rarity;
  const progressLabel = progressTarget != null
    ? progressTarget > 999 ? `${(progressTarget / 1000).toFixed(progressTarget % 1000 === 0 ? 0 : 1)}k` : String(progressTarget)
    : null;

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tipW = tooltipRef.current?.offsetWidth ?? 180;
    const tipH = tooltipRef.current?.offsetHeight ?? 80;
    let x = r.left + r.width / 2 - tipW / 2;
    let y = r.top - tipH - 8;
    if (x < 4) x = 4;
    if (x + tipW > window.innerWidth - 4) x = window.innerWidth - 4 - tipW;
    if (y < 4) y = r.bottom + 8;
    setPos({ x, y });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <div className="relative flex w-full flex-col items-center gap-1 rounded-xl p-1.5 transition-colors">
      {pos && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] whitespace-nowrap rounded-lg border px-3 py-2 text-left shadow-lg"
          style={{ background: '#1C2127', borderColor: 'rgba(255,255,255,0.08)', left: pos.x, top: pos.y }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BadgeIcon name={icon} className="h-4 w-4" style={{ color: hex }} />
            <span className="text-xs font-bold text-white">{title}</span>
          </div>
          <div className="text-[11px] text-white/60">{description}</div>
          {!isUnlocked && progressCurrent != null && progressTarget != null && (
            <div className="mt-1 text-[10px] text-white/40">{progressCurrent}/{progressTarget > 999 ? `${(progressTarget / 1000).toFixed(progressTarget % 1000 === 0 ? 0 : 1)}k` : progressTarget}</div>
          )}
          {isUnlocked && progressCurrent != null && progressTarget != null && (
            <div className="mt-1 text-[10px] text-white/40">{progressCurrent}/{progressTarget > 999 ? `${(progressTarget / 1000).toFixed(progressTarget % 1000 === 0 ? 0 : 1)}k` : progressTarget} para o próximo nível</div>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: hex }}>{rarityLabel}</span>
          </div>
        </div>
      )}
      <div
        ref={triggerRef}
        className="relative cursor-default"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-105"
          style={{ background: isUnlocked ? `rgba(${rgb}, 0.133)` : 'transparent', boxShadow: `${hex} 0px 0px 0px 2px` }}
        >
          <BadgeIcon name={icon} className={`h-5 w-5`} style={{ color: hex }} />
        </div>
        {badgeCount != null && badgeCount > 1 && (
          <span
            className="absolute -bottom-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-[#14181C]"
            style={{ background: '#14181C', color: hex }}
          >
            x{badgeCount}
          </span>
        )}
        {!isUnlocked && progressLabel && (
          <span
            className="absolute -bottom-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-[#14181C]"
            style={{ background: '#14181C', color: hex }}
          >
            {progressCurrent}/{progressLabel}
          </span>
        )}
      </div>
      <span className="line-clamp-1 text-[10px] font-bold leading-none text-white">
        {title}
      </span>
      <span className="text-[8px] font-semibold uppercase leading-none tracking-wider" style={{ color: hex }}>
        {rarityLabel}
      </span>
    </div>
  );
};

const BadgesSection = ({ userId }: BadgesSectionProps) => {
  const location = useLocation();
  const [data, setData] = useState<BadgeResponse | null>(null);

  useEffect(() => {
    getUserBadges(userId).then((r: { data: BadgeResponse }) => setData(r.data)).catch(() => {});
  }, [userId, location.pathname]);

  if (!data) return null;
  if (data.unlocked.length === 0 && data.next_milestones.length === 0) return null;

  const unlockedKeys = new Set(data.unlocked.map((b: UserBadge) => b.key));

  const items: Array<{ key: string; icon: string; title: string; rarity: string; description: string; isUnlocked: boolean; badgeCount?: number; progressCurrent?: number; progressTarget?: number; sortPriority: number }> = [];

  for (const badge of data.unlocked) {
    items.push({
      key: badge.key,
      icon: badge.icon,
      title: badge.title,
      rarity: badge.rarity,
      description: badge.description,
      isUnlocked: true,
      sortPriority: 0,
      progressCurrent: (badge as any).next_current as number | undefined,
      progressTarget: (badge as any).next_target as number | undefined,
    });
  }

  for (const m of data.next_milestones) {
    if (!unlockedKeys.has(m.key)) {
      items.push({
        key: m.key,
        icon: m.icon,
        title: m.title,
        rarity: m.rarity,
        description: m.description,
        isUnlocked: false,
        progressCurrent: m.current,
        progressTarget: m.target,
        sortPriority: 1,
      });
    }
  }

  items.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
  });

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {items.map((item) => (
        <BadgeItem
          key={item.key}
          icon={item.icon}
          title={item.title}
          rarity={item.rarity}
          description={item.description}
          isUnlocked={item.isUnlocked}
          badgeCount={item.badgeCount}
          progressCurrent={item.progressCurrent}
          progressTarget={item.progressTarget}
        />
      ))}
    </div>
  );
};

export default BadgesSection;
