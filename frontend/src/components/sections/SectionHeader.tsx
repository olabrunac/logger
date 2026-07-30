import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  linkTo?: string;
  linkLabel?: string;
  count?: number;
}

const SectionHeader = ({ title, linkTo, linkLabel, count }: SectionHeaderProps) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-white lg:text-base">
      <span className="block h-4 w-1 rounded-sm lg:h-5" style={{ background: 'var(--accent)' }} />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {count !== undefined && (
        <span className="text-xs tabular-nums opacity-50" style={{ color: 'var(--accent)' }}>({count})</span>
      )}
    </h2>
    {linkTo && (
      <Link to={linkTo} className="flex items-center gap-0.5 text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--accent)' }}>
        {linkLabel || 'Ver mais'}
        <ChevronRight size={14} />
      </Link>
    )}
  </div>
);

export default SectionHeader;
