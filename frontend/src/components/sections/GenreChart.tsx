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
      const gStr = log.media_item.genres || log.media_item.steam_genres || log.media_item.book_categories;
      if (gStr) {
        gStr.split(', ').forEach((genre: string) => {
          const trimmed = genre.trim();
          if (trimmed) {
            genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
          }
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
      .slice(0, 5);
  }, [logs, mediaType]);

  if (genreData.length === 0) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Gêneros / Categorias</div>
        <div className="text-[11px] text-white/40 py-3 text-center">Nenhum gênero registrado</div>
      </div>
    );
  }

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
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Gêneros / Categorias</div>
      <div className="flex flex-col gap-1.5">
        {genreData.map((item, index) => (
          <div key={item.genre} className="flex items-center gap-2">
            <span className="w-20 text-right text-[11px] text-white/50 truncate flex-shrink-0" title={item.genre}>
              {item.genre}
            </span>
            <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-sm transition-all duration-300" style={{ width: item.percentage + '%', background: colors[index % colors.length] }} />
            </div>
            <span className="w-5 text-[10px] text-white/40">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenreChart;
