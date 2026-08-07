import type { ReactNode } from 'react';
import { imageUrl } from '../utils';

interface LayoutSectionDef {
  id: string;
  label: string;
  icon: ReactNode;
  visible: boolean;
  premium: boolean;
}

interface LayoutPreviewProps {
  device: 'desktop' | 'mobile';
  sections: LayoutSectionDef[];
  username: string;
  displayName?: string;
  accentColor?: string;
  avatarUrl?: string | null;
}

const LayoutPreview = ({ device, sections, username, displayName, accentColor, avatarUrl }: LayoutPreviewProps) => {
  const visible = sections.filter(s => s.visible);
  const isMobile = device === 'mobile';
  const accent = accentColor || 'var(--accent)';
  const avatar = imageUrl(avatarUrl);

  return (
    <div className={`${isMobile ? 'w-[190px]' : 'w-[300px]'} shrink-0`}>
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-bg)] overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          {isMobile ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
              <div className="w-16 h-1.5 rounded-full bg-white/15 mx-auto" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500/70" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/70" />
              <span className="w-2 h-2 rounded-full bg-green-500/70" />
              <span className="ml-2 text-[9px] text-white/30 font-mono flex-1 truncate">loggerboxd / profile</span>
            </>
          )}
        </div>

        <div className="px-3 pt-2 pb-3">
          <div className="h-8 rounded-lg" style={{ background: `linear-gradient(90deg, ${accent}55, transparent)` }} />
          <div className="flex items-end gap-2 -mt-3">
            {avatar ? (
              <div className="w-7 h-7 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: 'var(--mdf-bg)' }}>
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-black shrink-0" style={{ background: accent, borderColor: 'var(--mdf-bg)' }}>
                {(displayName || username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 pt-1">
              <p className="text-[10px] font-bold text-white truncate leading-none">{displayName || username}</p>
              <p className="text-[8px] text-white/40 leading-tight">@{username}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {[3, 2, 4].map((n, i) => (
              <div key={i} className="flex-1 h-7 rounded-md bg-white/[0.04] flex items-center justify-center text-[7px] text-white/30">{n}</div>
            ))}
          </div>
        </div>

        <div className="px-2 pb-3 space-y-1.5">
          {visible.map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-white/5 px-2 py-1.5">
              <span className="text-white/50">{s.icon}</span>
              <span className="text-[9px] text-white/70 truncate">{s.label}</span>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-[9px] text-white/30 text-center py-2">Nenhuma seção visível</p>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[9px] text-white/30">{isMobile ? 'Visualização mobile' : 'Visualização desktop'}</p>
    </div>
  );
};

export default LayoutPreview;
