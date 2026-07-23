import { useMemo } from 'react';
import type { LogEntry } from '../../types';

interface HoursPieChartProps {
  logs: LogEntry[];
  mediaType?: string;
}

const TYPE_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  game: { color: '#60a5fa', label: 'Jogos', emoji: '🎮' },
  movie: { color: '#fbbf24', label: 'Filmes', emoji: '🎬' },
  series: { color: '#ef4444', label: 'Séries', emoji: '📺' },
  book: { color: '#4ade80', label: 'Livros', emoji: '📚' },
};

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
};

const HoursPieChart = ({ logs, mediaType }: HoursPieChartProps) => {
  const data = useMemo(() => {
    const filtered = logs.filter((l) => !mediaType || l.media_item.media_type === mediaType);
    const hoursMap: Record<string, number> = {};
    filtered.forEach((l) => {
      const type = l.media_item.media_type;
      hoursMap[type] = (hoursMap[type] || 0) + (l.hours_spent || 0);
    });
    const total = Object.values(hoursMap).reduce((s, h) => s + h, 0);
    return Object.entries(hoursMap)
      .map(([type, hours]) => ({
        type,
        hours,
        percentage: total > 0 ? (hours / total) * 100 : 0,
        ...TYPE_CONFIG[type],
      }))
      .filter((d) => d.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [logs, mediaType]);

  if (data.length === 0) return null;

  const totalHours = data.reduce((s, d) => s + d.hours, 0);

  const cx = 80;
  const cy = 80;
  const outerR = 70;
  const innerR = 45; // donut mais grosso (3px mais fino o buraco)
  const gap = 1.5;

  let currentAngle = 0;
  const slices = data.map((d) => {
    const angle = (d.hours / totalHours) * 360;
    const startAngle = currentAngle + gap / 2;
    const endAngle = currentAngle + angle - gap / 2;
    currentAngle += angle;
    return { ...d, startAngle, endAngle };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Horas por Mídia</div>
      <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
        <svg width="110" height="110" viewBox="0 0 160 160">
          {slices.map((s) => (
            <path
              key={s.type}
              d={describeArc(cx, cy, outerR, s.startAngle, s.endAngle)}
              fill="none"
              stroke={s.color}
              strokeWidth={outerR - innerR}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1 }}>
            {Math.round(totalHours)}h
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
        {data.map((d) => (
          <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: 1, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {d.emoji} {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HoursPieChart;
