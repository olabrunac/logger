import { useMemo } from 'react';
import type { LogEntry } from '../../types';

interface ActivityGraphProps {
  logs: LogEntry[];
  mediaType?: string;
}

const TYPE_COLORS: Record<string, string> = {
  game: '#60a5fa',
  movie: '#fbbf24',
  series: '#ef4444',
  book: '#4ade80',
};

const ActivityGraph = ({ logs, mediaType }: ActivityGraphProps) => {
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => !mediaType || l.media_item.media_type === mediaType);
  }, [logs, mediaType]);

  const activityData = useMemo(() => {
    const dayMap: Record<string, Record<string, number>> = {};

    filteredLogs.forEach((log) => {
      const date = log.log_date.split('T')[0];
      const type = log.media_item.media_type;
      if (!dayMap[date]) dayMap[date] = {};
      dayMap[date][type] = (dayMap[date][type] || 0) + 1;
    });

    const startDate = new Date(2026, 0, 1);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const startOffset = startDate.getDay();
    const totalSlots = startOffset + totalDays + 1;

    const weeks: { date: string; counts: Record<string, number>; total: number }[][] = [];
    let currentWeek: { date: string; counts: Record<string, number>; total: number }[] = [];

    for (let i = 0; i < totalSlots; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i - startOffset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const counts = dayMap[dateStr] || {};
      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      currentWeek.push({ date: dateStr, counts, total });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return weeks;
  }, [filteredLogs]);

  const getColor = (counts: Record<string, number>, total: number) => {
    if (total === 0) return 'rgba(255, 255, 255, 0.05)';
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const baseColor = TYPE_COLORS[dominant[0]] || '#666';
    const alpha = total === 1 ? '33' : total === 2 ? '66' : total === 3 ? '99' : 'cc';
    return baseColor + alpha;
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-row">
          <h2 className="section-title">Mapa de Atividade</h2>
        </div>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '3px' }}>
          {activityData.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  title={`${day.date}: ${day.total} log${day.total !== 1 ? 's' : ''}`}
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '2px',
                    background: getColor(day.counts, day.total),
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    transition: 'transform 0.1s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span>{type === 'game' ? 'Jogos' : type === 'movie' ? 'Filmes' : type === 'series' ? 'Séries' : 'Livros'}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default ActivityGraph;
