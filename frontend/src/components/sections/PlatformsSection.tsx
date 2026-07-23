import { useMemo } from 'react';
import type { LogEntry } from '../../types';

interface PlatformsSectionProps {
  logs: LogEntry[];
  accentColor: string;
  mediaType?: string;
}

const PlatformsSection = ({ logs, accentColor, mediaType }: PlatformsSectionProps) => {
  const platformData = useMemo(() => {
    const platformCounts: Record<string, number> = {};
    const filtered = logs.filter((l) => {
      if (mediaType && l.media_item.media_type !== mediaType) return false;
      return l.platform && l.platform.trim() !== '';
    });

    filtered.forEach((log) => {
      const platform = log.platform!;
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const total = Object.values(platformCounts).reduce((sum, c) => sum + c, 0);
    return Object.entries(platformCounts)
      .map(([platform, count]) => ({
        platform,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [logs, mediaType]);

  if (platformData.length === 0) return null;

  const colors = [
    accentColor,
    '#a855f7',
    '#60a5fa',
    '#4ade80',
    '#fbbf24',
    '#f87171',
    '#f472b6',
    '#34d399',
  ];

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-accent-bar" style={{ background: accentColor }} />
          <h2 className="section-title">Plataformas</h2>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {platformData.map((item, index) => (
          <div key={item.platform} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: '120px', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.platform}
            </span>
            <div style={{ flex: 1, height: '20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${item.percentage}%`,
                  height: '100%',
                  background: colors[index % colors.length],
                  borderRadius: 'var(--radius-sm)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span style={{ width: '40px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', flexShrink: 0 }}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformsSection;
