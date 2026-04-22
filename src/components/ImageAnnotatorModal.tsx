import { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, MessageSquarePlus, RotateCcw, Trash2, Minus, Plus, X, Check } from "lucide-react";

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#ff0000";
  const r = parseInt(safe.slice(1, 3), 16) / 255;
  const g = parseInt(safe.slice(3, 5), 16) / 255;
  const b = parseInt(safe.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, v };
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#facc15", "#4ade80",
  "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6",
  "#ffffff", "#111827",
];

const SQ_W = 192;
const SQ_H = 140;

function GradientSquare({ h, s, v, onChange }: {
  h: number; s: number; v: number;
  onChange: (s: number, v: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hueHex = hsvToHex(h, 1, 1);
    const g1 = ctx.createLinearGradient(0, 0, SQ_W, 0);
    g1.addColorStop(0, "#fff");
    g1.addColorStop(1, hueHex);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, SQ_W, SQ_H);
    const g2 = ctx.createLinearGradient(0, 0, 0, SQ_H);
    g2.addColorStop(0, "transparent");
    g2.addColorStop(1, "#000");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, SQ_W, SQ_H);
  }, [h]);

  const readPos = (e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ns = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nv = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    cbRef.current(ns, nv);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) readPos(e); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="relative flex-shrink-0" style={{ width: SQ_W, height: SQ_H }}>
      <canvas
        ref={canvasRef}
        width={SQ_W}
        height={SQ_H}
        className="block w-full h-full"
        style={{ cursor: "crosshair", borderRadius: "10px" }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          dragging.current = true;
          readPos(e);
        }}
      />
      <div
        className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none"
        style={{
          left: `clamp(6px, ${s * 100}%, calc(100% - 6px))`,
          top: `clamp(6px, ${(1 - v) * 100}%, calc(100% - 6px))`,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

const STRIP_H = 12;

function HueStrip({ h, onChange }: { h: number; onChange: (h: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, SQ_W, 0);
    [0, 60, 120, 180, 240, 300, 360].forEach((deg, i) => {
      grad.addColorStop(i / 6, `hsl(${deg},100%,50%)`);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SQ_W, STRIP_H);
  }, []);

  const readHue = (e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    cbRef.current(pct * 360);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) readHue(e); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="relative mt-2.5" style={{ height: STRIP_H }}>
      <canvas
        ref={canvasRef}
        width={SQ_W}
        height={STRIP_H}
        className="block w-full h-full"
        style={{ cursor: "ew-resize", borderRadius: 9999 }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          dragging.current = true;
          readHue(e);
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
        style={{
          left: `clamp(8px, ${(h / 360) * 100}%, calc(100% - 8px))`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

function ColorPickerPopover({ color, onChange }: {
  color: string;
  onChange: (c: string) => void;
}) {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexInput, setHexInput] = useState(color.toUpperCase());

  const update = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h, s, v);
    setHsv({ h, s, v });
    setHexInput(hex.toUpperCase());
    onChange(hex);
  }, [onChange]);

  const applyPreset = (c: string) => {
    const newHsv = hexToHsv(c);
    setHsv(newHsv);
    setHexInput(c.toUpperCase());
    onChange(c);
  };

  return (
    <div
      className="absolute bottom-full mb-3 bg-primary-800 border border-primary-600 rounded-2xl p-3 shadow-2xl z-50 overflow-hidden"
      style={{ width: SQ_W + 24, left: "50%", transform: "translateX(-50%)" }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <GradientSquare h={hsv.h} s={hsv.s} v={hsv.v} onChange={(s, v) => update(hsv.h, s, v)} />
      <HueStrip h={hsv.h} onChange={h => update(h, hsv.s, hsv.v)} />

      <div className="flex items-center gap-2 mt-3">
        <div className="w-8 h-8 rounded-lg border border-primary-600 flex-shrink-0" style={{ backgroundColor: color }} />
        <input
          type="text"
          value={hexInput}
          maxLength={7}
          onChange={e => {
            const val = e.target.value;
            setHexInput(val);
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
              setHsv(hexToHsv(val));
              onChange(val);
            }
          }}
          style={{ userSelect: "text" }}
          className="flex-1 bg-primary-700 border border-primary-600 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-200 font-mono uppercase focus:outline-none focus:border-primary-500 transition-colors"
          placeholder="#000000"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-primary-700">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => applyPreset(c)}
            className="rounded-full transition-all hover:scale-110 flex-shrink-0"
            style={{
              width: 18, height: 18,
              backgroundColor: c,
              outline: color === c ? "2px solid var(--primary-400)" : "2px solid transparent",
              outlineOffset: 2,
              boxShadow: (c === "#ffffff" || c === "#111827") ? "0 0 0 1px var(--primary-600)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface Pin {
  id: string;
  xPct: number;
  yPct: number;
  text: string;
  editing: boolean;
}

type AnnotResult = {
  imageUrl: string;
  blob: Blob | null;
  pins: Array<{ xPct: number; yPct: number; text: string }>;
};

interface SavedImageState {
  annotationDataURL: string | null;
  hasDrawn: boolean;
  pins: Pin[];
}

function generateBlobForImageUrl(sourceUrl: string, annotationDataURL: string | null): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, nw, nh);
      if (annotationDataURL) {
        const annot = new window.Image();
        annot.onload = () => { ctx.drawImage(annot, 0, 0, nw, nh); canvas.toBlob(b => resolve(b), "image/png"); };
        annot.onerror = () => canvas.toBlob(b => resolve(b), "image/png");
        annot.src = annotationDataURL;
      } else {
        canvas.toBlob(b => resolve(b), "image/png");
      }
    };
    img.onerror = () => resolve(null);
    img.src = sourceUrl;
  });
}

interface Props {
  imageUrl: string;
  imageUrls?: string[];
  onClose: () => void;
  onConfirm: (
    text: string,
    blob: Blob | null,
    pins: Array<{ xPct: number; yPct: number; text: string }>,
    allResults?: AnnotResult[]
  ) => void;
}

export default function ImageAnnotatorModal({ imageUrl, imageUrls, onClose, onConfirm }: Props) {
  const allUrls = imageUrls ?? [imageUrl];
  const [activeIdx, setActiveIdx] = useState(() => {
    const i = allUrls.indexOf(imageUrl);
    return i >= 0 ? i : 0;
  });
  const activeUrl = allUrls[activeIdx] ?? imageUrl;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const perImageStateRef = useRef<Map<number, SavedImageState>>(new Map());
  const isDrawingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const colorContainerRef = useRef<HTMLDivElement>(null);
  const pinDrag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);

  const [tool, setTool] = useState<"draw" | "pin">("draw");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [pins, setPins] = useState<Pin[]>([]);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const hasDrawnRef = useRef(false);

  function navigateTo(newIdx: number) {
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0) {
      perImageStateRef.current.set(activeIdx, {
        annotationDataURL: hasDrawnRef.current ? canvas.toDataURL("image/png") : null,
        hasDrawn: hasDrawnRef.current,
        pins: [...pins],
      });
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setPins([]);
    setHistory([]);
    setCanvasReady(false);
    hasDrawnRef.current = false;
    setActiveIdx(newIdx);
  }

  useEffect(() => {
    if (!colorPickerOpen) return;
    function handler(e: MouseEvent) {
      if (colorContainerRef.current && !colorContainerRef.current.contains(e.target as Node)) {
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorPickerOpen]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!pinDrag.current) return;
      const container = imgContainerRef.current;
      if (!container) return;
      const dx = e.clientX - pinDrag.current.startX;
      const dy = e.clientY - pinDrag.current.startY;
      if (!pinDrag.current.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        pinDrag.current.moved = true;
        setDraggingPinId(pinDrag.current.id);
      }
      if (pinDrag.current.moved) {
        const rect = container.getBoundingClientRect();
        const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const id = pinDrag.current.id;
        setPins(prev => prev.map(p => p.id === id ? { ...p, xPct, yPct, editing: false } : p));
      }
    }
    function onMouseUp() {
      if (!pinDrag.current) return;
      if (!pinDrag.current.moved) {
        const id = pinDrag.current.id;
        setPins(prev => prev.map(p =>
          p.id === id ? { ...p, editing: !p.editing } : { ...p, editing: false }
        ));
      }
      pinDrag.current = null;
      setDraggingPinId(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const setupCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const saved = perImageStateRef.current.get(activeIdx);
    if (saved) {
      setPins(saved.pins);
      if (saved.hasDrawn && saved.annotationDataURL) {
        const annotImg = new window.Image();
        annotImg.onload = () => {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(annotImg, 0, 0, canvas.width, canvas.height);
          hasDrawnRef.current = true;
          setCanvasReady(true);
        };
        annotImg.src = saved.annotationDataURL;
        return;
      }
    }
    setCanvasReady(true);
  }, [activeIdx]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory(prev => [...prev.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "draw") return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (!pos) return;
    saveToHistory();
    isDrawingRef.current = true;
    lastPos.current = pos;
  }, [tool, getCanvasPos, saveToHistory]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "draw" || !isDrawingRef.current || !lastPos.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (!pos) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    hasDrawnRef.current = true;
  }, [tool, color, strokeWidth, getCanvasPos]);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPos.current = null;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "pin") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPins(prev => [
      ...prev.map(p => ({ ...p, editing: false })),
      { id: crypto.randomUUID(), xPct, yPct, text: "", editing: true },
    ]);
  }, [tool]);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(history[history.length - 1], 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveToHistory();
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  }, [saveToHistory]);


  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0) {
        perImageStateRef.current.set(activeIdx, {
          annotationDataURL: hasDrawnRef.current ? canvas.toDataURL("image/png") : null,
          hasDrawn: hasDrawnRef.current,
          pins: [...pins],
        });
      }

      const allResults: AnnotResult[] = [];
      for (let i = 0; i < allUrls.length; i++) {
        const state = perImageStateRef.current.get(i);
        if (!state) continue;
        const filteredPins = state.pins
          .filter(p => p.text.trim())
          .map(p => ({ xPct: p.xPct, yPct: p.yPct, text: p.text.trim() }));
        if (!state.hasDrawn && filteredPins.length === 0) continue;
        const blob = await generateBlobForImageUrl(allUrls[i], state.annotationDataURL);
        allResults.push({ imageUrl: allUrls[i], blob, pins: filteredPins });
      }

      const first = allResults[0];
      onConfirm(
        "",
        first?.blob ?? null,
        first?.pins ?? [],
        allResults.length > 1 ? allResults : undefined,
      );
    } finally {
      setConfirming(false);
    }
  }, [pins, activeIdx, allUrls, onConfirm]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (document.activeElement as HTMLElement)?.tagName === "TEXTAREA"
        || (document.activeElement as HTMLElement)?.tagName === "INPUT";
      if (!typing) {
        if (e.key === "c" || e.key === "C") { setTool("pin"); setColorPickerOpen(false); }
        if (e.key === "v" || e.key === "V") { setTool("draw"); setColorPickerOpen(false); }
        if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) handleUndo();
      }
      if (e.key === "Escape") {
        setColorPickerOpen(false);
        setPins(prev => {
          if (prev.some(p => p.editing)) return prev.map(p => ({ ...p, editing: false }));
          return prev;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 overflow-hidden"
      style={{ userSelect: "none" }}
      onMouseUp={stopDrawing}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-300 hover:text-gray-100 border border-primary-700 hover:border-primary-500 rounded-lg transition-colors bg-primary-900/80"
        >
          <X size={13} /> Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <Check size={13} /> {confirming ? "Salvando…" : "Salvar"}
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center gap-3" style={{ paddingBottom: "5.5rem" }}>
        {allUrls.length > 1 && (
          <button
            type="button"
            onClick={() => navigateTo((activeIdx - 1 + allUrls.length) % allUrls.length)}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-800/80 hover:bg-primary-700 border border-primary-600 text-gray-200 flex items-center justify-center backdrop-blur-sm transition-colors z-30 self-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div className="flex flex-col items-center gap-2" style={{ lineHeight: 0 }}>
          <div ref={imgContainerRef} className="relative inline-block" style={{ lineHeight: 0 }}>
          <img
            ref={imgRef}
            src={activeUrl}
            alt="Entregável"
            crossOrigin="anonymous"
            className="block object-contain"
            style={{ maxWidth: "calc(100vw - 10rem)", maxHeight: "calc(100vh - 9rem)" }}
            onLoad={setupCanvas}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              zIndex: 10,
              cursor: tool === "draw" ? "crosshair" : "cell",
              touchAction: "none",
              opacity: canvasReady ? 1 : 0,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={stopDrawing}
            onClick={handleCanvasClick}
          />
          {canvasReady && pins.map((pin, idx) => (
            <PinMarker
              key={pin.id}
              pin={pin}
              index={idx}
              isDragging={draggingPinId === pin.id}
              onPinMouseDown={e => {
                e.stopPropagation();
                e.preventDefault();
                pinDrag.current = { id: pin.id, startX: e.clientX, startY: e.clientY, moved: false };
              }}
              onTextChange={text => setPins(prev => prev.map(p => p.id === pin.id ? { ...p, text } : p))}
              onCloseEdit={() => setPins(prev => prev.map(p => p.id === pin.id ? { ...p, editing: false } : p))}
              onRemove={() => setPins(prev => prev.filter(p => p.id !== pin.id))}
            />
          ))}
          </div>
          {allUrls.length > 1 && (
            <span className="text-[12px] text-gray-500 mt-1 select-none">{activeIdx + 1} / {allUrls.length}</span>
          )}
        </div>
        {allUrls.length > 1 && (
          <button
            type="button"
            onClick={() => navigateTo((activeIdx + 1) % allUrls.length)}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-800/80 hover:bg-primary-700 border border-primary-600 text-gray-200 flex items-center justify-center backdrop-blur-sm transition-colors z-30 self-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-primary-900 border border-primary-700 rounded-2xl px-3 py-2 shadow-2xl">

        <TipBtn title="Lápis" shortcut="V" active={tool === "draw"} onClick={() => { setTool("draw"); setColorPickerOpen(false); }}>
          <Pencil size={17} />
        </TipBtn>
        <TipBtn title="Comentário" shortcut="C" active={tool === "pin"} onClick={() => { setTool("pin"); setColorPickerOpen(false); }}>
          <MessageSquarePlus size={17} />
        </TipBtn>

        <Sep />

        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => { setColor(c); setColorPickerOpen(false); }}
            className="flex-shrink-0 rounded-full transition-transform hover:scale-110"
            style={{
              width: 14, height: 14,
              backgroundColor: c,
              outline: color === c ? "2px solid var(--primary-400)" : "2px solid transparent",
              outlineOffset: 2,
              boxShadow: (c === "#ffffff" || c === "#111827") ? "0 0 0 1px var(--primary-600)" : "none",
            }}
          />
        ))}

        <Sep />

        <div ref={colorContainerRef} className="relative flex-shrink-0">
          <button
            type="button"
            title="Seletor de cores"
            onClick={() => setColorPickerOpen(p => !p)}
            className={`relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110 overflow-hidden ${
              colorPickerOpen ? "border-primary-400 scale-110" : "border-primary-600 hover:border-primary-400"
            }`}
            style={{
              background: "conic-gradient(hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
            }}
          >
            <span className="absolute rounded-full pointer-events-none" style={{ inset: 4, backgroundColor: color, boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }} />
          </button>
          {colorPickerOpen && <ColorPickerPopover color={color} onChange={setColor} />}
        </div>

        {tool === "draw" && (
          <>
            <Sep />
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setStrokeWidth(w => Math.max(1, w - 1))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-100 hover:bg-primary-700 rounded-lg transition-colors">
                <Minus size={11} />
              </button>
              <span className="text-[13px] text-gray-300 w-5 text-center font-mono tabular-nums">{strokeWidth}</span>
              <button type="button" onClick={() => setStrokeWidth(w => Math.min(20, w + 1))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-100 hover:bg-primary-700 rounded-lg transition-colors">
                <Plus size={11} />
              </button>
            </div>
          </>
        )}

        <Sep />

        <TipBtn title="Desfazer" shortcut="Ctrl+Z" disabled={!history.length} onClick={handleUndo}>
          <RotateCcw size={15} />
        </TipBtn>
        <TipBtn title="Limpar tudo" onClick={handleClear}>
          <Trash2 size={15} />
        </TipBtn>
      </div>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-primary-700 mx-1.5 flex-shrink-0" />;
}

function TipBtn({ title, shortcut, active, disabled, onClick, children }: {
  title: string; shortcut?: string; active?: boolean; disabled?: boolean;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative group/tip flex-shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${
          active ? "bg-primary-500 text-primary-900" : "text-gray-400 hover:text-gray-100 hover:bg-primary-700"
        }`}
      >
        {children}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
        <div className="bg-primary-800 border border-primary-600 rounded-lg px-2.5 py-1.5 text-center shadow-xl whitespace-nowrap">
          <p className="text-[12px] text-gray-200 font-medium leading-none">{title}</p>
          {shortcut && <p className="text-[10px] text-gray-400 mt-1 leading-none">{shortcut}</p>}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--primary-600)" }} />
      </div>
    </div>
  );
}

function PinMarker({ pin, index, isDragging, onPinMouseDown, onTextChange, onCloseEdit, onRemove }: {
  pin: Pin; index: number; isDragging: boolean;
  onPinMouseDown: (e: React.MouseEvent) => void;
  onTextChange: (text: string) => void;
  onCloseEdit: () => void;
  onRemove: () => void;
}) {
  const popupLeft = pin.xPct > 65;
  const popupUp = pin.yPct > 70;

  return (
    <div
      style={{
        position: "absolute",
        left: `${pin.xPct}%`,
        top: `${pin.yPct}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 20,
      }}
    >
      <button
        type="button"
        onMouseDown={onPinMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center shadow-lg border-2 transition-transform hover:scale-110 select-none ${
          isDragging ? "scale-110 shadow-2xl" : ""
        } ${
          pin.text.trim()
            ? "bg-primary-500 border-primary-300 text-primary-900"
            : "bg-yellow-400 border-yellow-200 text-black"
        }`}
      >
        {index + 1}
      </button>

      {pin.editing && !isDragging && (
        <div
          className="absolute bg-primary-800 border border-primary-600 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
          style={{
            width: 240,
            zIndex: 40,
            ...(popupLeft ? { right: "calc(100% + 10px)" } : { left: "calc(100% + 10px)" }),
            ...(popupUp
              ? { bottom: "50%", transform: "translateY(50%)" }
              : { top: "50%", transform: "translateY(-50%)" }),
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
              Ponto {index + 1}
            </span>
            <button type="button" onClick={onRemove} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">
              Remover
            </button>
          </div>
          <textarea
            autoFocus
            rows={3}
            placeholder="O que deve ser ajustado aqui?"
            value={pin.text}
            onChange={e => onTextChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onCloseEdit();
              }
            }}
            style={{ userSelect: "text" }}
            className="w-full bg-primary-700 border border-primary-600 rounded-lg px-2.5 py-2 text-[13px] text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500 transition-colors leading-relaxed"
          />
          <p className="text-[10px] text-gray-600">Enter para salvar · Shift+Enter nova linha · Esc para fechar</p>
        </div>
      )}
    </div>
  );
}
