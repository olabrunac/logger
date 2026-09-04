import type { SidebarActivityDay } from '../../types';

interface ActivityGraphProps {
  activity: SidebarActivityDay[];
  mediaType?: string;
}

const TYPE_COLORS: Record<string, string> = {
  game: '#60a5fa',
  movie: '#fbbf24',
  series: '#ef4444',
  book: '#4ade80',
};

const ActivityGraph = ({ activity, mediaType: _mediaType }: ActivityGraphProps) => {
  const weeks: SidebarActivityDay[][] = [];
  let currentWeek: SidebarActivityDay[] = [];

  activity.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getColor = (day: SidebarActivityDay) => {
    if (day.total === 0) return 'rgba(255, 255, 255, 0.05)';
    const dominant = Object.entries(day.counts).sort((a, b) => b[1] - a[1])[0];
    const baseColor = TYPE_COLORS[dominant[0]] || '#666';
    const alpha = day.total === 1 ? '33' : day.total === 2 ? '66' : day.total === 3 ? '99' : 'cc';
    return baseColor + alpha;
  };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '3px' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  title={`${day.date}: ${day.total} log${day.total !== 1 ? 's' : ''}`}
                  style={{
                    width: '13px',
                    height: '13px',
                    borderRadius: '2px',
                    background: getColor(day),
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
