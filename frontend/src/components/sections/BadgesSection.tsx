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
    <div className="space-y-3">
      {categories.map(cat => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">
            {CATEGORY_LABELS[cat] || cat}
          </div>

          {unlockedByCategory[cat] && (
            <div className="flex flex-wrap gap-2 mb-2">
              {unlockedByCategory[cat].map(badge => (
                <div
                  key={badge.key}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: 'var(--accent)', background: 'rgba(255,255,255,0.02)' }}
                  title={badge.description}
                >
                  <span className="text-lg">{badge.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{badge.title}</div>
                    {badge.unlocked_at && (
                      <div className="text-[10px] text-white/30">
                        {new Date(badge.unlocked_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {milestonesByCategory[cat] && (
            <div className="flex flex-col gap-1.5">
              {milestonesByCategory[cat].map(m => {
                const pct = Math.min((m.current / m.target) * 100, 100);
                return (
                  <div key={m.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-sm opacity-40">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/50 truncate">{m.title}</span>
                        <span className="text-[10px] text-white/30 ml-2 flex-shrink-0">{m.current}/{m.target}</span>
                      </div>
                      <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: 'var(--accent)', opacity: 0.6 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BadgesSection;
