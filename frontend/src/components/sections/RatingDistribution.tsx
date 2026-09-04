import type { SidebarRating } from '../../types';

interface RatingDistributionProps {
  rating: SidebarRating;
  mediaType?: string;
  color: string;
}

const hexToHsl = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const STAR_VALUES = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

const formatStar = (star: number) => (Number.isInteger(star) ? String(star) : star.toFixed(1));

const RatingDistribution = ({ rating, mediaType: _mediaType, color }: RatingDistributionProps) => {
  const buckets = rating.buckets;
  const total = rating.total;

  if (total === 0) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Avaliações</div>
        <div className="text-[11px] text-white/40 py-3 text-center">Nenhuma avaliação ainda</div>
      </div>
    );
  }

  const { h: hue, s } = hexToHsl(color);
  const maxCount = Math.max(...buckets, 1);

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Avaliações</div>
      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-1 h-20 pt-2.5">
          {STAR_VALUES.map((star) => {
            const idx = STAR_VALUES.indexOf(star);
            const count = buckets[idx];
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isFull = Number.isInteger(star);
            const barPct = Math.max(count > 0 ? 8 : 2, pct);
            return (
              <div key={star} title={`${formatStar(star)}★: ${count}`} className={`relative h-full ${isFull ? 'flex-1' : 'flex-[0.25]'}`}>
                {count > 0 && (
                  <span
                    className="absolute left-0 right-0 text-center text-[8px] leading-none font-semibold text-white/80"
                    style={{ bottom: barPct + '%', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                  >
                    {count}
                  </span>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                  style={{
                    height: barPct + '%',
                    background: count > 0
                      ? `hsl(${hue}, ${s}%, ${Math.round(32 + (star / 5) * 33)}%)`
                      : 'rgba(255,255,255,0.05)',
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {STAR_VALUES.map((star) => {
            return Number.isInteger(star) ? (
              <div key={star} className="flex-1 flex flex-col items-center leading-none">
                <span className="text-[9px] font-semibold" style={{ color: `hsl(${hue}, ${s}%, ${Math.round(32 + (star / 5) * 33)}%)` }}>
                  {formatStar(star)}★
                </span>
              </div>
            ) : (
              <div key={star} className="flex-[0.25]" />
            );
          })}
        </div>
      </div>
      <div className="mt-2 text-[10px] text-white/30">
        Média: {rating.avg.toFixed(1)} · {total} total
      </div>
    </div>
  );
};

export default RatingDistribution;
