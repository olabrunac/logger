import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, RotateCw } from 'lucide-react';

interface ImageFramingModalProps {
  open: boolean;
  sourceUrl: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  title: string;
  positionOnly?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  onConfirmPosition?: (position: string) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const ROTATE_RAD = (deg: number) => (deg * Math.PI) / 180;

function drawCrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  img: HTMLImageElement,
  zoom: number,
  pan: { x: number; y: number },
  rotation: number,
) {
  const rad = ROTATE_RAD(rotation);
  const rotated = rotation % 180 !== 0;
  const base = Math.max((rotated ? H : W) / img.naturalWidth, (rotated ? W : H) / img.naturalHeight) * zoom;
  const drawW = img.naturalWidth * base;
  const drawH = img.naturalHeight * base;
  const screenW = rotated ? drawH : drawW;
  const screenH = rotated ? drawW : drawH;
  const maxPanX = Math.max(0, (screenW - W) / (2 * W));
  const maxPanY = Math.max(0, (screenH - H) / (2 * H));
  const px = clamp(pan.x, -maxPanX, maxPanX);
  const py = clamp(pan.y, -maxPanY, maxPanY);
  const cx = W / 2 + px * W;
  const cy = H / 2 + py * H;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

export function ImageFramingModal({ open, sourceUrl, aspectRatio, outputWidth, outputHeight, title, positionOnly, onCancel, onConfirm, onConfirmPosition }: ImageFramingModalProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
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
    setRotation(0);
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
    drawCrop(ctx, outputWidth, outputHeight, img, zoom, pan, rotation);
  }, [img, zoom, pan, rotation, outputWidth, outputHeight]);

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
    const rotated = rotation % 180 !== 0;
    const base = Math.max((rotated ? outputHeight : outputWidth) / img.naturalWidth, (rotated ? outputWidth : outputHeight) / img.naturalHeight) * zoom;
    const drawW = img.naturalWidth * base;
    const drawH = img.naturalHeight * base;
    const screenW = rotated ? drawH : drawW;
    const screenH = rotated ? drawW : drawH;
    const maxPanX = Math.max(0, (screenW - outputWidth) / (2 * outputWidth));
    const maxPanY = Math.max(0, (screenH - outputHeight) / (2 * outputHeight));
    return { x: clamp(next.x, -maxPanX, maxPanX), y: clamp(next.y, -maxPanY, maxPanY) };
  };

  const onPointerDown = (e: React.PointerEvent<Element>) => {
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<Element>) => {
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

  const rotateImage = () => {
    setRotation(r => {
      const next = (r + 90) % 360;
      setPan(p => clampPanFor(p));
      return next;
    });
  };

  const resetAll = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleConfirm = async () => {
    if (positionOnly) {
      if (!onConfirmPosition) return;
      const posX = Math.round((50 - pan.x * 100) * 10) / 10;
      const posY = Math.round((50 - pan.y * 100) * 10) / 10;
      onConfirmPosition(`${posX} ${posY}`);
      return;
    }
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawCrop(ctx, outputWidth, outputHeight, img, zoom, pan, rotation);
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
          {positionOnly ? 'Arraste para escolher onde o banner corta' : 'Arraste para mover · role para dar zoom · gire para ajustar'}
        </div>

        <div className="rounded-xl overflow-hidden relative" style={{ background: '#000' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ aspectRatio: String(aspectRatio) }}>
              <span className="text-sm text-white/50">Carregando imagem...</span>
            </div>
          ) : positionOnly ? (
            <div
              className="w-full block cursor-grab active:cursor-grabbing touch-none select-none"
              style={{
                aspectRatio: String(aspectRatio),
                backgroundImage: `url(${sourceUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: `${Math.round((50 - pan.x * 100) * 10) / 10}% ${Math.round((50 - pan.y * 100) * 10) / 10}%`,
                minHeight: '120px',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            />
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
          {!positionOnly && (
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
          )}
          {!positionOnly && (
            <button
              type="button"
              onClick={rotateImage}
              className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              title="Girar 90°"
            >
              <RotateCw size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={resetAll}
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
