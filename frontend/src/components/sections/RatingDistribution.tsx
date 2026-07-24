import { useMemo } from 'react';
import type { LogEntry } from '../../types';

interface RatingDistributionProps {
  logs: LogEntry[];
  mediaType?: string;
  color: string;
}

const hexToHsl = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const RatingDistribution = ({ logs, mediaType, color }: RatingDistributionProps) => {
  const data = useMemo(() => {
    const filtered = logs.filter((l) => l.rating && l.rating > 0 && (!mediaType || l.media_item.media_type === mediaType));
    const buckets = [0, 0, 0, 0, 0];
    filtered.forEach((l) => {
      const r = Math.round((l.rating || 0) * 2) / 2;
      const idx = Math.min(Math.floor(r), 4);
      if (r > 0) buckets[idx]++;
    });
    const total = buckets.reduce((s, c) => s + c, 0);
    const maxCount = Math.max(...buckets, 1);
    return { buckets, total, maxCount };
  }, [logs, mediaType]);

  if (data.total === 0) return null;

  const { h, s } = hexToHsl(color);
  const barColors = [
    `hsl(${h}, ${s}%, 35%)`,
    `hsl(${h}, ${s}%, 45%)`,
    `hsl(${h}, ${s}%, 52%)`,
    `hsl(${h}, ${s}%, 60%)`,
    `hsl(${h}, ${Math.min(s + 5, 100)}%, 65%)`,
  ];

  const avg = logs.filter((l) => l.rating && l.rating > 0 && (!mediaType || l.media_item.media_type === mediaType)).reduce((s, l) => s + (l.rating || 0), 0) / Math.max(data.total, 1);

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Avaliações</div>
      <div className="flex flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const idx = star - 1;
          const count = data.buckets[idx];
          const pct = data.maxCount > 0 ? (count / data.maxCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs font-semibold" style={{ color: barColors[idx] }}>
                {star}★
              </span>
              <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-sm transition-all duration-300" style={{ width: pct + '%', background: barColors[idx] }} />
              </div>
              <span className="w-5 text-[10px] text-white/40">{count}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-white/30">
        Média: {avg.toFixed(1)} · {data.total} total
      </div>
    </div>
  );
};

export default RatingDistribution;
