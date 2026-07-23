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
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-accent-bar" style={{ background: color }} />
          <h2 className="section-title">Distribuição de Avaliações</h2>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[5, 4, 3, 2, 1].map((star) => {
          const idx = star - 1;
          const count = data.buckets[idx];
          const pct = data.maxCount > 0 ? (count / data.maxCount) * 100 : 0;
          return (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '24px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: barColors[idx] }}>
                {star}★
              </span>
              <div style={{ flex: 1, height: '18px', background: 'var(--mdf-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: barColors[idx], borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ width: '32px', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        Média: {avg.toFixed(1)} · Total: {data.total} avaliações
      </div>
    </div>
  );
};

export default RatingDistribution;
