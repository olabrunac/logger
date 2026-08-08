import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { TimelineEntry, GroupItem } from '../types/feed';
import { TYPE_META } from '../constants/designSystem';
import { statusLabels } from '../constants/statusLabels';
import { imageUrl } from '../utils';

const groupItemUrl = (item: GroupItem): string => {
  let apiId: string | number | undefined = item.steam_appid || item.igdb_id || item.tmdb_id || item.google_books_id || item.id;
  if (item.google_books_id) apiId = item.google_books_id;
  return `/log/${item.media_type || 'movie'}/${apiId}`;
};

const LogGroupCard = ({ entry }: { entry: TimelineEntry }) => {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [twoLinesHeight, setTwoLinesHeight] = useState(0);
  const itemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = itemsRef.current;
    if (!el) return;
    const check = () => {
      const rowH = el.firstElementChild?.getBoundingClientRect().height || 0;
      const twoLines = rowH * 2 + 8;
      setTwoLinesHeight(twoLines);
      setClamped(twoLines > 0 && el.scrollHeight > twoLines);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [entry.group_items]);

  if (!entry.user || !entry.media_item || !entry.group_items) return null;
  const meta = TYPE_META[entry.media_item.media_type as keyof typeof TYPE_META] || TYPE_META.game;
  const avatarUrl = imageUrl(entry.user.avatar_url);
  const statusLabel = entry.status
    ? (statusLabels[entry.media_item.media_type]?.[entry.status] ?? entry.status)
    : 'registrou';

  return (
    <div className="mdf-card rounded-xl p-4 transition-colors">
      <div className="flex gap-4">
        <Link to={`/profile/${entry.user.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={entry.user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {entry.user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm mb-3">
            <Link to={`/profile/${entry.user.username}`} className="font-bold text-white hover:underline">{entry.user.username}</Link>
            <span className="text-white/40">{statusLabel} {entry.group_count} {meta.singular.toLowerCase()}s</span>
            <span className="text-white/40">{meta.emoji}</span>
          </div>

          <div
            ref={itemsRef}
            className={`flex gap-2 flex-wrap ${!expanded && clamped ? 'overflow-hidden' : ''}`}
            style={!expanded && clamped && twoLinesHeight > 0 ? { maxHeight: twoLinesHeight } : undefined}
          >
            {entry.group_items.map((item) => {
              const itemStatusLabel = item.status ? statusLabels[item.media_type || '']?.[item.status] : null;
              return (
                <Link key={item.id} to={groupItemUrl(item)} className="group/log-item flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors border" style={{ borderColor: 'var(--border)' }}>
                  {item.cover_image_url ? (
                    <div className="w-8 h-11 rounded overflow-hidden flex-shrink-0">
                      <img src={imageUrl(item.cover_image_url) || ''} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-11 rounded flex items-center justify-center flex-shrink-0 text-xs" style={{ background: meta.color + '22' }}>
                      {meta.emoji}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white/70 truncate max-w-[160px]">{item.title}</div>
                    {itemStatusLabel && (
                      <div className="text-[10px] text-white/40">{itemStatusLabel}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {clamped && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {expanded ? 'Ver menos' : `Ver mais ${entry.group_count} ${meta.singular.toLowerCase()}s`}
              <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}

          <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
            {entry.log_date && (
              <span>{new Date(entry.log_date).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogGroupCard;
