import { useMemo } from 'react';
import type { LogEntry } from '../../types';

interface GenreChartProps {
  logs: LogEntry[];
  accentColor: string;
  mediaType?: string;
}

const GenreChart = ({ logs, accentColor, mediaType }: GenreChartProps) => {
  const genreData = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    const filtered = logs.filter((l) => !mediaType || l.media_item.media_type === mediaType);

    filtered.forEach((log) => {
      if (log.media_item.genres) {
        log.media_item.genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const total = Object.values(genreCounts).reduce((sum, c) => sum + c, 0);
    return Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs, mediaType]);

  if (genreData.length === 0) return null;

  const colors = [
    accentColor,
    '#a855f7',
    '#60a5fa',
    '#4ade80',
    '#fbbf24',
    '#f87171',
    '#f472b6',
    '#34d399',
    '#fb923c',
    '#818cf8',
  ];

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-accent-bar" style={{ background: accentColor }} />
          <h2 className="section-title">Principais Gêneros</h2>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {genreData.map((item, index) => (
          <div key={item.genre} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: '100px', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
              {item.genre}
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

export default GenreChart;
