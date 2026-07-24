import type { LogEntry } from '../../types';

interface StatsSectionProps {
  logs: LogEntry[];
  accentColor: string;
  mediaType?: string;
}

const StatsSection = ({ logs, accentColor: _accentColor, mediaType }: StatsSectionProps) => {
  const filteredLogs = logs.filter((l) => !mediaType || l.media_item.media_type === mediaType);

  const ratedLogs = filteredLogs.filter((l) => l.rating && l.rating > 0);
  const avgRating = ratedLogs.length > 0
    ? ratedLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / ratedLogs.length
    : 0;

  const avgHours = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, l) => sum + (l.hours_spent || 0), 0) / filteredLogs.length
    : 0;

  const completedCount = filteredLogs.filter((l) => l.status === 'completed' || l.status === 'platinated').length;
  const avgCompletion = filteredLogs.length > 0
    ? (completedCount / filteredLogs.length) * 100
    : 0;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Estatísticas</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-lg font-bold text-white">{filteredLogs.length}</div>
          <div className="text-[10px] text-white/40 mt-0.5">Total</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-lg font-bold text-white">{avgHours > 0 ? `${avgHours.toFixed(1)}h` : '—'}</div>
          <div className="text-[10px] text-white/40 mt-0.5">Média Horas</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-lg font-bold text-white">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</div>
          <div className="text-[10px] text-white/40 mt-0.5">Média Rating</div>
        </div>
      </div>

      {mediaType === 'game' && (
        <div className="text-center p-2 rounded-lg mt-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-sm font-bold text-white">{avgCompletion.toFixed(0)}%</span>
          <span className="text-[10px] text-white/40 ml-1.5">Média de Compleção</span>
        </div>
      )}
    </div>
  );
};

export default StatsSection;
