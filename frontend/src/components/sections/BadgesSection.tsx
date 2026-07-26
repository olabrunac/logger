import { useEffect, useState, type ComponentType } from 'react';
import {
  Wrench, Film, Tv, Gamepad2, BookOpen, Trophy, Star, Flame,
  Users, UserPlus, MessageCircle, Target, Award, Heart, Compass,
} from 'lucide-react';
import { getUserBadges } from '../../services/api';
import type { UserBadge, BadgeResponse } from '../../types';

interface BadgesSectionProps {
  userId: number;
}

const ICON_MAP: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Wrench, Film, Tv, Gamepad2, BookOpen, Trophy, Star, Flame,
  Users, UserPlus, MessageCircle, Target, Award, Heart, Compass,
};

const RARITY_LABELS: Record<string, string> = {
  bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante",
  lendario: "Lendário", imortal: "Imortal", arcano: "Arcano", celestial: "Celestial", cosmico: "Cósmico",
};

const RARITY_HEX: Record<string, string> = {
  bronze: "#CD7F32", prata: "#C0C0C0", ouro: "#F5C518", diamante: "#3B82F6",
  lendario: "#A85FEB", imortal: "#EF4444", arcano: "#22C55E", celestial: "#06B6D4", cosmico: "#EC4899",
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

  return (
    <div
      className={`group flex w-full flex-col items-center gap-1 rounded-xl p-1.5 transition-colors ${!isUnlocked ? 'opacity-60' : ''}`}
      title={description}
    >
      <div className="relative">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-105"
          style={{ background: isUnlocked ? `rgba(${rgb}, 0.133)` : 'transparent', boxShadow: `${hex} 0px 0px 0px 2px` }}
        >
          <BadgeIcon name={icon} className={`h-5 w-5 ${!isUnlocked ? 'opacity-40' : ''}`} style={{ color: hex }} />
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
  const [data, setData] = useState<BadgeResponse | null>(null);

  useEffect(() => {
    getUserBadges(userId).then((r: { data: BadgeResponse }) => setData(r.data)).catch(() => {});
  }, [userId]);

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
    });
  }

  for (const m of data.next_milestones) {
    if (!unlockedKeys.has(m.key)) {
      items.push({
        key: m.key,
        icon: m.icon,
        title: m.title,
        rarity: m.rarity,
        description: `${m.current}/${m.target}`,
        isUnlocked: false,
        progressCurrent: m.current,
        progressTarget: m.target,
        sortPriority: 1,
      });
    }
  }

  items.sort((a, b) => a.sortPriority - b.sortPriority);

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
