import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';

interface ImageFramingModalProps {
  open: boolean;
  sourceUrl: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  title: string;
  stretch?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function drawCrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  img: HTMLImageElement,
  zoom: number,
  pan: { x: number; y: number },
  stretch = false,
) {
  let drawW: number;
  let drawH: number;
  if (stretch) {
    drawW = W * zoom;
    drawH = H * zoom;
  } else {
    const base = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
    drawW = img.naturalWidth * base;
    drawH = img.naturalHeight * base;
  }
  const maxPanX = Math.max(0, (drawW - W) / (2 * W));
  const maxPanY = Math.max(0, (drawH - H) / (2 * H));
  const px = clamp(pan.x, -maxPanX, maxPanX);
  const py = clamp(pan.y, -maxPanY, maxPanY);
  const cx = W / 2 + px * W;
  const cy = H / 2 + py * H;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

export function ImageFramingModal({ open, sourceUrl, aspectRatio, outputWidth, outputHeight, title, stretch = false, onCancel, onConfirm }: ImageFramingModalProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setLoading(false);
    };
    image.onerror = () => setLoading(false);
    image.src = sourceUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [open, sourceUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCrop(ctx, outputWidth, outputHeight, img, zoom, pan, stretch);
  }, [img, zoom, pan, outputWidth, outputHeight, stretch]);

  useEffect(() => {
    if (!open) return;
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(z => clamp(z * factor, 1, 4));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  const clampPanFor = (next: { x: number; y: number }) => {
    if (!img) return next;
    let drawW: number;
    let drawH: number;
    if (stretch) {
      drawW = outputWidth * zoom;
      drawH = outputHeight * zoom;
    } else {
      const base = Math.max(outputWidth / img.naturalWidth, outputHeight / img.naturalHeight) * zoom;
      drawW = img.naturalWidth * base;
      drawH = img.naturalHeight * base;
    }
    const maxPanX = Math.max(0, (drawW - outputWidth) / (2 * outputWidth));
    const maxPanY = Math.max(0, (drawH - outputHeight) / (2 * outputHeight));
    return { x: clamp(next.x, -maxPanX, maxPanX), y: clamp(next.y, -maxPanY, maxPanY) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setPan(p => clampPanFor({ x: p.x + dx / rect.width, y: p.y + dy / rect.height }));
  };

  const stopDrag = () => {
    draggingRef.current = false;
  };

  const handleConfirm = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawCrop(ctx, outputWidth, outputHeight, img, zoom, pan, stretch);
      canvas.toBlob(blob => {
        setSaving(false);
        if (blob) onConfirm(blob);
      }, 'image/jpeg', 0.92);
    } catch {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-xl rounded-2xl bg-[var(--mdf-surface)] border border-white/10 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button className="text-white/50 hover:text-white" onClick={onCancel}><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 text-xs text-white/50">
          Arraste para mover · role para dar zoom
        </div>

        <div className="rounded-xl overflow-hidden relative" style={{ background: '#000' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ aspectRatio: String(aspectRatio) }}>
              <span className="text-sm text-white/50">Carregando imagem...</span>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={outputWidth}
              height={outputHeight}
              className="w-full block cursor-grab active:cursor-grabbing touch-none select-none"
              style={{ aspectRatio: String(aspectRatio) }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title="Resetar"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || loading || !img}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-black transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Processando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
