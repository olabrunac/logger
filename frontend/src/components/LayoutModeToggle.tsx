import { Monitor } from 'lucide-react';
import { useLayoutMode } from '../hooks/useLayoutMode';
import type { LayoutMode } from '../hooks/useLayoutMode';

const OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'web', label: 'Web' },
];

export default function LayoutModeToggle({ className = '' }: { className?: string }) {
  const { mode, setMode } = useLayoutMode();
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Monitor size={14} />
        <span className="text-xs font-medium">Layout</span>
      </div>
      <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setMode(o.value)}
            className="flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
            style={
              mode === o.value
                ? { background: 'var(--accent-bg)', color: 'var(--accent)' }
                : { color: 'var(--text-muted)' }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
