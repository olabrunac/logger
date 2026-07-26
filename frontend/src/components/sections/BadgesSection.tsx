import { useEffect, useState } from 'react';
import { getUserBadges } from '../../services/api';
import type { UserBadge, BadgeProgress, BadgeResponse } from '../../types';

interface BadgesSectionProps {
  userId: number;
}

const CATEGORY_ORDER = ["special", "media", "platinum", "reviews", "streak", "social", "general"];

const CATEGORY_LABELS: Record<string, string> = {
  special: "Especial",
  media: "Por Tipo de Mídia",
  platinum: "Platina",
  reviews: "Reviews",
  streak: "Sequência",
  social: "Social",
  general: "Gerais",
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

const BadgesSection = ({ userId }: BadgesSectionProps) => {
  const [data, setData] = useState<BadgeResponse | null>(null);

  useEffect(() => {
    getUserBadges(userId).then((r: { data: BadgeResponse }) => setData(r.data)).catch(() => {});
  }, [userId]);

  if (!data) return null;

  const unlockedByCategory: Record<string, UserBadge[]> = {};
  data.unlocked.forEach((b: UserBadge) => {
    if (!unlockedByCategory[b.category]) unlockedByCategory[b.category] = [];
    unlockedByCategory[b.category].push(b);
  });

  const milestonesByCategory: Record<string, BadgeProgress[]> = {};
  data.next_milestones.forEach((m: BadgeProgress) => {
    if (!milestonesByCategory[m.category]) milestonesByCategory[m.category] = [];
    milestonesByCategory[m.category].push(m);
  });

  const categories = CATEGORY_ORDER.filter(c => unlockedByCategory[c] || milestonesByCategory[c]);

  if (data.unlocked.length === 0 && data.next_milestones.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {categories.map(cat => {
        const unlocked = unlockedByCategory[cat] || [];
        const milestones = milestonesByCategory[cat] || [];
        return (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1.5">
              {CATEGORY_LABELS[cat] || cat}
            </div>
            <div className="flex flex-col gap-1.5">
              {unlocked.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5">
                  {unlocked.map((badge) => {
                    const hex = RARITY_HEX[badge.rarity] || RARITY_HEX.bronze;
                    const rgb = hexToRgb(hex);
                    const rarityLabel = RARITY_LABELS[badge.rarity] || badge.rarity;
                    return (
                      <div
                        key={badge.key}
                        className="group flex w-full flex-col items-center gap-1 rounded-xl p-1.5 transition-colors"
                        title={badge.description}
                      >
                        <div className="relative">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                            style={{ background: `rgba(${rgb}, 0.133)`, boxShadow: `${hex} 0px 0px 0px 2px` }}
                          >
                            <span className="text-xl">{badge.icon}</span>
                          </div>
                        </div>
                        <span className="line-clamp-1 text-[10px] font-bold leading-none text-white">
                          {badge.title}
                        </span>
                        <span className="text-[8px] font-semibold uppercase leading-none tracking-wider" style={{ color: hex }}>
                          {rarityLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {milestones.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5">
                  {milestones.map((m) => {
                    const pct = Math.min((m.current / m.target) * 100, 100);
                    const isUnlocked = pct >= 100;
                    const hex = isUnlocked ? (RARITY_HEX[m.rarity] || RARITY_HEX.bronze) : "#3F4555";
                    const rgb = hexToRgb(hex);
                    const rarityLabel = RARITY_LABELS[m.rarity] || m.rarity;
                    const label = m.target > 999 ? `${(m.target / 1000).toFixed(m.target % 1000 === 0 ? 0 : 1)}k` : String(m.target);
                    return (
                      <div
                        key={m.key}
                        className={`group flex w-full flex-col items-center gap-1 rounded-xl p-1.5 transition-colors ${!isUnlocked ? 'opacity-60' : ''}`}
                        title={`${m.title} — ${m.current}/${m.target}`}
                      >
                        <div className="relative">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full transition-transform"
                            style={{ background: isUnlocked ? `rgba(${rgb}, 0.133)` : 'transparent', boxShadow: `${hex} 0px 0px 0px 2px` }}
                          >
                            <span className={`text-xl ${!isUnlocked ? 'opacity-40' : ''}`}>{m.icon}</span>
                          </div>
                          {!isUnlocked && (
                            <span
                              className="absolute -bottom-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-[#14181C]"
                              style={{ background: '#14181C', color: hex }}
                            >
                              {m.current}/{label}
                            </span>
                          )}
                        </div>
                        <span className="line-clamp-1 text-[10px] font-bold leading-none text-white">
                          {m.title}
                        </span>
                        <span className="text-[8px] font-semibold uppercase leading-none tracking-wider" style={{ color: hex }}>
                          {rarityLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgesSection;
