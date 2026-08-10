import { useId } from 'react';
import { getStars } from '../constants/designSystem';

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

interface StarsProps {
  rating?: number;
  size?: number;
}

export default function Stars({ rating, size = 12 }: StarsProps) {
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const stars = getStars(rating);
  const list = stars.length > 0 ? stars : ['empty', 'empty', 'empty', 'empty', 'empty'];

  return (
    <div className="flex items-center gap-0.5">
      {list.map((s, i) => {
        if (s === 'full') {
          return (
            <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="var(--mdf-yellow)" stroke="var(--mdf-yellow)" strokeWidth="2">
              <polygon points={STAR_POINTS} />
            </svg>
          );
        }
        if (s === 'half') {
          const gid = `${baseId}-half-${i}`;
          return (
            <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--mdf-yellow)" strokeWidth="2">
              <defs>
                <linearGradient id={gid}>
                  <stop offset="0%" stopColor="var(--mdf-yellow)" />
                  <stop offset="50%" stopColor="var(--mdf-yellow)" />
                  <stop offset="50%" stopColor="var(--mdf-yellow)" stopOpacity="0" />
                  <stop offset="100%" stopColor="var(--mdf-yellow)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={STAR_POINTS} fill={`url(#${gid})`} />
            </svg>
          );
        }
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--mdf-yellow)" strokeWidth="2">
            <polygon points={STAR_POINTS} />
          </svg>
        );
      })}
    </div>
  );
}
