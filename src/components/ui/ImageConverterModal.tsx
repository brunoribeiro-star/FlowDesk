"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ImageSpec } from "@/lib/imageSpecs";

interface Props {
  file: File;
  spec: ImageSpec;
  onAccept: (file: File) => void;
  onCancel: () => void;
}

const CANVAS_W = 500;
const CANVAS_H = 340;
const HANDLE_SIZE = 9;

type CropRect = { x: number; y: number; w: number; h: number };
type DragMode = "move" | "tl" | "tr" | "bl" | "br" | null;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function ImageConverterModal({ file, spec, onAccept, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgBoundsRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const cropRef = useRef<CropRect>({ x: 0, y: 0, w: 0, h: 0 });

  const [originalSize] = useState((file.size / 1024).toFixed(0) + " KB");
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState("");

  const dragMode = useRef<DragMode>(null);
  const dragStart = useRef({ mx: 0, my: 0, snap: { x: 0, y: 0, w: 0, h: 0 } });

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;

      const scale = Math.min(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const ox = (CANVAS_W - dw) / 2;
      const oy = (CANVAS_H - dh) / 2;
      imgBoundsRef.current = { x: ox, y: oy, w: dw, h: dh };

      const ar = spec.targetWidth / spec.targetHeight;
      let cw = dw;
      let ch = cw / ar;
      if (ch > dh) { ch = dh; cw = ch * ar; }
      const cx = ox + (dw - cw) / 2;
      const cy = oy + (dh - ch) / 2;
      const initial = { x: cx, y: cy, w: cw, h: ch };
      setCrop(initial);
      cropRef.current = initial;
      drawAll(img, { x: ox, y: oy, w: dw, h: dh }, initial);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, spec]);

  const drawAll = useCallback(
    (img: HTMLImageElement, ib: typeof imgBoundsRef.current, c: CropRect) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, ib.x, ib.y, ib.w, ib.h);
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.beginPath();
      ctx.rect(c.x, c.y, c.w, c.h);
      ctx.clip();
      ctx.drawImage(img, ib.x, ib.y, ib.w, ib.h);
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const tx = c.x + (c.w * i) / 3;
        const ty = c.y + (c.h * i) / 3;
        ctx.beginPath(); ctx.moveTo(tx, c.y); ctx.lineTo(tx, c.y + c.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x, ty); ctx.lineTo(c.x + c.w, ty); ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      const hs = HANDLE_SIZE;
      const corners: [number, number][] = [
        [c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h],
      ];
      corners.forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      });
    },
    []
  );

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !crop.w) return;
    drawAll(img, imgBoundsRef.current, crop);
  }, [crop, drawAll]);

  function getCanvasXY(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / r.width;
    const scaleY = CANVAS_H / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  function whichHandle(mx: number, my: number, c: CropRect): DragMode {
    const t = HANDLE_SIZE * 1.5;
    if (Math.abs(mx - c.x) < t && Math.abs(my - c.y) < t) return "tl";
    if (Math.abs(mx - (c.x + c.w)) < t && Math.abs(my - c.y) < t) return "tr";
    if (Math.abs(mx - c.x) < t && Math.abs(my - (c.y + c.h)) < t) return "bl";
    if (Math.abs(mx - (c.x + c.w)) < t && Math.abs(my - (c.y + c.h)) < t) return "br";
    if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return "move";
    return null;
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasXY(e);
    const mode = whichHandle(x, y, cropRef.current);
    dragMode.current = mode;
    dragStart.current = { mx: x, my: y, snap: { ...cropRef.current } };
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragMode.current) return;
    const { x: mx, y: my } = getCanvasXY(e);
    const dx = mx - dragStart.current.mx;
    const dy = my - dragStart.current.my;
    const { snap } = dragStart.current;
    const ib = imgBoundsRef.current;
    const ar = spec.targetWidth / spec.targetHeight;

    let next = { ...snap };

    if (dragMode.current === "move") {
      next.x = clamp(snap.x + dx, ib.x, ib.x + ib.w - snap.w);
      next.y = clamp(snap.y + dy, ib.y, ib.y + ib.h - snap.h);
    } else {
      const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
      const sign = dragMode.current === "tl" || dragMode.current === "bl" ? -1 : 1;
      const newW = clamp(snap.w + sign * delta, 40, ib.w);
      const newH = newW / ar;

      next.w = newW;
      next.h = newH;

      if (dragMode.current === "tl") { next.x = snap.x + snap.w - newW; next.y = snap.y + snap.h - newH; }
      if (dragMode.current === "tr") { next.y = snap.y + snap.h - newH; }
      if (dragMode.current === "bl") { next.x = snap.x + snap.w - newW; }

      next.x = clamp(next.x, ib.x, ib.x + ib.w - next.w);
      next.y = clamp(next.y, ib.y, ib.y + ib.h - next.h);
    }

    setCrop(next);
    cropRef.current = next;
  }

  function onMouseUp() {
    dragMode.current = null;
  }

  async function convertAndAccept() {
    const img = imgRef.current;
    if (!img) return;
    setConverting(true);
    setStatus("Processando...");

    const ib = imgBoundsRef.current;
    const c = cropRef.current;

    const scale = img.naturalWidth / ib.w;
    const srcX = (c.x - ib.x) * scale;
    const srcY = (c.y - ib.y) * scale;
    const srcW = c.w * scale;
    const srcH = c.h * scale;

    const offscreen = document.createElement("canvas");
    offscreen.width = spec.targetWidth;
    offscreen.height = spec.targetHeight;
    const ctx = offscreen.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, spec.targetWidth, spec.targetHeight);

    const maxBytes = spec.maxKB * 1024;

    const blobAt = (q: number): Promise<Blob | null> =>
      new Promise((res) => offscreen.toBlob(res, "image/webp", q));

    let lo = 0.05;
    let hi = 0.95;
    let bestBlob: Blob | null = null;

    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      const b = await blobAt(mid);
      if (!b) break;
      if (b.size <= maxBytes) {
        lo = mid;
        bestBlob = b;
      } else {
        hi = mid;
      }
    }

    if (!bestBlob) {
      bestBlob = await blobAt(0.05);
    }

    if (!bestBlob) {
      setConverting(false);
      setStatus("Erro ao converter.");
      return;
    }

    const finalKB = (bestBlob.size / 1024).toFixed(0);
    setStatus(`✓ ${finalKB} KB`);

    const outputName = file.name.replace(/\.[^.]+$/, ".webp");
    const outputFile = new File([bestBlob], outputName, { type: "image/webp" });

    setConverting(false);
    onAccept(outputFile);
  }

  const targetAR = (spec.targetWidth / spec.targetHeight).toFixed(2);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-[560px] shadow-2xl flex flex-col gap-5 p-6 animate-fade-in">
        <div>
          <h3 className="text-[17px] font-semibold text-gray-100">Converter imagem</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="text-primary-300">{spec.label}</span> · {spec.targetWidth}×{spec.targetHeight} px · máx. {spec.maxKB} KB
          </p>
        </div>

        <div className="rounded-xl overflow-hidden bg-black border border-primary-700" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full h-full cursor-crosshair select-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-primary-800 border border-primary-700 rounded-full px-3 py-1 text-gray-300">
            Original: {originalSize}
          </span>
          <span className="bg-primary-800 border border-primary-700 rounded-full px-3 py-1 text-gray-300">
            Alvo: {spec.targetWidth}×{spec.targetHeight} px
          </span>
          <span className="bg-primary-800 border border-primary-700 rounded-full px-3 py-1 text-gray-300">
            Proporção: {targetAR}:1
          </span>
          <span className="bg-primary-800 border border-emerald-700/50 rounded-full px-3 py-1 text-emerald-400">
            Saída: WebP · máx. {spec.maxKB} KB
          </span>
          {status && (
            <span className="bg-primary-800 border border-primary-500 rounded-full px-3 py-1 text-primary-300">
              {status}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 -mt-1">
          Arraste o recorte para reposicionar · Arraste os cantos para redimensionar. A imagem será convertida para WebP e otimizada automaticamente.
        </p>

        <div className="flex justify-end gap-3 pt-1 border-t border-primary-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-primary-600 text-gray-300 hover:bg-primary-700 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={convertAndAccept}
            disabled={converting}
            className="px-5 py-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {converting ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                Convertendo...
              </>
            ) : (
              "Converter e usar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
