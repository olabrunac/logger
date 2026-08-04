import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl } from '../utils';

export interface PostImageItem {
  id: number;
  url: string;
  is_gif: boolean;
}

const toSrc = (url: string) => imageUrl(url) || '';

export function PostImages({ images }: { images: PostImageItem[] }) {
  const imgs = images.slice(0, 4);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (viewer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null);
      if (e.key === 'ArrowRight') setViewer(v => (v === null ? v : (v + 1) % imgs.length));
      if (e.key === 'ArrowLeft') setViewer(v => (v === null ? v : (v - 1 + imgs.length) % imgs.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, imgs.length]);

  if (imgs.length === 0) return null;

  const tile = (img: PostImageItem, index: number, cls: string) => (
    <button
      key={img.id}
      type="button"
      onClick={() => setViewer(index)}
      className={`relative overflow-hidden bg-black/40 block cursor-zoom-in ${cls}`}
    >
      <img src={toSrc(img.url)} alt="" className="w-full h-full object-contain" loading="lazy" />
    </button>
  );

  let content: ReactNode;
  if (imgs.length === 1) {
    content = (
      <button
        type="button"
        onClick={() => setViewer(0)}
        className="w-full flex justify-center bg-black/40 cursor-zoom-in"
      >
        <img src={toSrc(imgs[0].url)} alt="" className="max-h-[480px] max-w-full object-contain" loading="lazy" />
      </button>
    );
  } else if (imgs.length === 2) {
    content = (
      <div className="grid grid-cols-2 gap-0.5">
        {imgs.map((img, i) => tile(img, i, 'aspect-square'))}
      </div>
    );
  } else if (imgs.length === 3) {
    content = (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5">
        {tile(imgs[0], 0, 'aspect-square row-span-2')}
        {tile(imgs[1], 1, 'aspect-square')}
        {tile(imgs[2], 2, 'aspect-square')}
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 gap-0.5">
        {imgs.map((img, i) => tile(img, i, 'aspect-square'))}
      </div>
    );
  }

  return (
    <>
      {content}
      {viewer !== null && (
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setViewer(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setViewer(null); }}
            >
              <X size={20} />
            </button>
            {imgs.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setViewer(v => (v === null ? v : (v - 1 + imgs.length) % imgs.length)); }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="absolute right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setViewer(v => (v === null ? v : (v + 1) % imgs.length)); }}
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-4 z-10 text-xs font-mono text-white/60">
                  {viewer + 1} / {imgs.length}
                </div>
              </>
            )}
            <img
              src={toSrc(imgs[viewer].url)}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )
      )}
    </>
  );
}
