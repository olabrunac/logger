import { useMemo, useState } from 'react';
import type { LogEntry } from '../../types';
import { TYPE_META } from '../../constants/designSystem';

interface HoursPieChartProps {
  logs: LogEntry[];
  mediaType?: string;
}

const TYPE_CONFIG = Object.fromEntries(
  Object.entries(TYPE_META).map(([k, v]) => [k, { color: v.color, label: v.label }])
);

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
  const [hovered, setHovered] = useState<string | null>(null);

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

  const cx = 100;
  const cy = 100;
  const outerR = 70;
  const innerR = 35;
  const gap = 1.5;

  let currentAngle = 0;
  const slices = data.map((d) => {
    const angle = (d.hours / totalHours) * 360;
    const startAngle = currentAngle + gap / 2;
    const endAngle = currentAngle + angle - gap / 2;
    currentAngle += angle;
    return { ...d, startAngle, endAngle };
  });

  const hoveredSlice = hovered ? slices.find(s => s.type === hovered) : null;

  return (
    <div className="flex flex-col gap-0">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 w-full text-left">Horas por Mídia</div>
      <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0, margin: '0 auto' }}>
        <svg width="130" height="130" viewBox="0 0 200 200">
          {slices.map((s) => {
            const midAngle = (s.startAngle + s.endAngle) / 2;
            const mid = polarToCartesian(cx, cy, (outerR + innerR) / 2, midAngle);
            const isHovered = hovered === s.type;
            return (
              <g key={s.type} style={{ cursor: 'pointer' }}>
                <path
                  d={describeArc(cx, cy, outerR, s.startAngle, s.endAngle)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={outerR - innerR}
                  strokeLinecap="butt"
                  opacity={hovered && !isHovered ? 0.4 : 1}
                  style={{ transition: 'opacity 150ms' }}
                />
                <circle
                  cx={mid.x}
                  cy={mid.y}
                  r={outerR - innerR}
                  fill="transparent"
                  onMouseEnter={() => setHovered(s.type)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            );
          })}
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {hoveredSlice ? (
            <>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: hoveredSlice.color, lineHeight: 1 }}>
                {hoveredSlice.label}
              </span>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {Math.round(hoveredSlice.hours)}h · {Math.round(hoveredSlice.percentage)}%
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1 }}>
              {Math.round(totalHours)}h
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const d = data.find(x => x.type === type);
          if (!d) return null;
          return (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: cfg.color, flexShrink: 0 }} />
              <span>{cfg.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default HoursPieChart;
