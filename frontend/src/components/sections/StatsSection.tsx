import { formatHours } from '../../utils';
import type { SidebarStats } from '../../types';

interface StatsSectionProps {
  stats: SidebarStats;
  accentColor: string;
  mediaType?: string;
}

const StatsSection = ({ stats, accentColor: _accentColor, mediaType }: StatsSectionProps) => {
  const avgCompletion = stats.media_completion;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Estatísticas</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-lg font-bold text-white">{stats.total}</div>
          <div className="text-[10px] text-white/40 mt-0.5">{mediaType ? 'Registros' : 'Total'}</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-lg font-bold text-white">{formatHours(stats.hours) ?? '—'}</div>
          <div className="text-[10px] text-white/40 mt-0.5">{mediaType ? 'Horas' : 'Total Horas'}</div>
        </div>
      </div>

      <div className="text-center p-2 rounded-lg mt-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <span className="text-sm font-bold text-white">{formatHours(stats.wishlist_hours) ?? '—'}</span>
        <span className="text-[10px] text-white/40 ml-1.5">Horas na Wishlist</span>
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
