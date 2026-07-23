import type { LogEntry } from '../../types';

interface StatsSectionProps {
  logs: LogEntry[];
  accentColor: string;
  mediaType?: string;
}

const StatsSection = ({ logs, accentColor, mediaType }: StatsSectionProps) => {
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
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-accent-bar" style={{ background: accentColor }} />
          <h2 className="section-title">Estatísticas</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            {filteredLogs.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Total
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            {avgHours > 0 ? `${avgHours.toFixed(1)}h` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Média de Horas
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            {avgRating > 0 ? avgRating.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Média de Rating
          </div>
        </div>
      </div>

      {mediaType === 'game' && (
        <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)' }}>{avgCompletion.toFixed(0)}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Média de Compleção</span>
        </div>
      )}
    </div>
  );
};

export default StatsSection;
