import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        userSelect: "none",
        background: "radial-gradient(120% 90% at 50% 0%, var(--primary-800) 0%, var(--primary-900) 60%, var(--gray-900) 100%)",
        color: "var(--gray-100)",
      }}
      onMouseUp={stopDrawing}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: "grid", placeItems: "center",
            width: 46, height: 46, borderRadius: 13, cursor: "pointer",
            border: "1px solid var(--gray-700)",
            background: "color-mix(in srgb, var(--primary-800) 55%, transparent)",
            color: "var(--gray-200)",
            backdropFilter: "blur(8px)",
            transition: ".18s",
            flexShrink: 0,
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              height: 46, padding: "0 20px", fontFamily: "inherit",
              fontSize: 15, fontWeight: 600, cursor: "pointer", borderRadius: 13,
              whiteSpace: "nowrap", transition: ".2s",
              color: "var(--gray-200)", border: "1px solid var(--gray-700)",
              background: "color-mix(in srgb, var(--primary-800) 55%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            <X size={17} /> Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              height: 46, padding: "0 20px", fontFamily: "inherit",
              fontSize: 15, fontWeight: 600, cursor: "pointer", borderRadius: 13,
              whiteSpace: "nowrap", transition: ".2s",
              color: "var(--primary-900)", border: "none",
              background: "linear-gradient(180deg, var(--primary-400), var(--primary-500))",
              boxShadow: "0 14px 30px -14px rgba(30,182,232,0.85)",
              opacity: confirming ? 0.5 : 1,
            }}
          >
            <Check size={17} /> {confirming ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center gap-3" style={{ padding: "92px 40px 120px" }}>
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
          <div ref={imgContainerRef} className="relative inline-block" style={{ lineHeight: 0, borderRadius: 22, overflow: "hidden", border: "1px solid color-mix(in srgb, var(--gray-200) 14%, transparent)", boxShadow: "0 50px 120px -50px rgba(0,0,0,0.9), 0 0 0 1px rgba(6,25,31,0.5)" }}>
          <img
            ref={imgRef}
            src={activeUrl}
            alt="Entregável"
            crossOrigin="anonymous"
            className="block object-contain"
            style={{ maxWidth: "calc(100vw - 10rem)", maxHeight: "calc(100vh - 14rem)", display: "block" }}
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

      <div
        className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center"
        style={{
          bottom: 26,
          gap: 10,
          padding: "10px 14px",
          borderRadius: 18,
          background: "color-mix(in srgb, var(--primary-800) 86%, transparent)",
          border: "1px solid var(--gray-700)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 24px 60px -24px rgba(0,0,0,0.85)",
        }}
      >

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
            style={{
              display: "grid", placeItems: "center",
              width: 28, height: 28,
              borderRadius: "50%",
              border: 0,
              background: "none",
              cursor: "pointer",
              flexShrink: 0,
              padding: 0,
              transition: ".15s",
              boxShadow: color === c ? `0 0 0 2.5px ${c}` : "none",
            }}
          >
            <span
              style={{
                display: "block",
                width: 20, height: 20,
                borderRadius: "50%",
                backgroundColor: c,
                boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.25)${(c === "#ffffff" || c === "#111827") ? ", 0 0 0 1px var(--primary-700)" : ""}`,
                transition: ".15s",
                transform: color === c ? "scale(0.82)" : "scale(1)",
              }}
            />
          </button>
        ))}

        <Sep />

        <div ref={colorContainerRef} className="relative flex-shrink-0">
          <button
            type="button"
            title="Seletor de cores"
            onClick={() => setColorPickerOpen(p => !p)}
            style={{
              position: "relative",
              display: "grid",
              placeItems: "center",
              width: 36, height: 36,
              borderRadius: "50%",
              cursor: "pointer",
              border: 0,
              background: "conic-gradient(from 0deg, #ef5350, #ffa726, #ffd54f, #66bb6a, #1eb6e8, #5c8df5, #8c77d3, #ec6fb0, #ef5350)",
              color: "#fff",
              transition: ".16s",
              padding: 0,
              transform: colorPickerOpen ? "scale(1.06)" : "scale(1)",
            }}
          >
            <span style={{
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              background: "rgba(8,30,37,0.55)",
            }} />
            <svg style={{ position: "relative", zIndex: 1 }} width={16} height={16} viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>
            </svg>
          </button>
          {colorPickerOpen && <ColorPickerPopover color={color} onChange={setColor} />}
        </div>

        {tool === "draw" && (
          <>
            <Sep />
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button type="button" onClick={() => setStrokeWidth(w => Math.max(1, w - 1))}
                style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: 0, background: "none", cursor: "pointer", color: "var(--gray-400)", transition: ".16s" }}>
                <Minus size={12} />
              </button>
              <span style={{ fontSize: 13, color: "var(--gray-300)", width: 22, textAlign: "center", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{strokeWidth}</span>
              <button type="button" onClick={() => setStrokeWidth(w => Math.min(20, w + 1))}
                style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: 0, background: "none", cursor: "pointer", color: "var(--gray-400)", transition: ".16s" }}>
                <Plus size={12} />
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
    </div>,
    document.body
  );
}

function Sep() {
  return <div style={{ width: 1, height: 30, background: "var(--gray-700)", margin: "0 2px", flexShrink: 0 }} />;
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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44, height: 44,
          borderRadius: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          border: active ? "1px solid rgba(30,182,232,0.4)" : "1px solid transparent",
          background: active ? "rgba(30,182,232,0.16)" : "none",
          color: active ? "var(--primary-300)" : "var(--gray-300)",
          transition: ".16s",
          opacity: disabled ? 0.3 : 1,
          flexShrink: 0,
        }}
      >
        {children}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50" style={{ backdropFilter: "blur(12px)" }}>
        <div className="text-center whitespace-nowrap" style={{ background: "color-mix(in srgb, var(--primary-800) 92%, transparent)", border: "1px solid var(--primary-700)", borderRadius: 10, padding: "8px 12px", boxShadow: "0 16px 40px -16px rgba(0,0,0,0.9)" }}>
          <p style={{ fontSize: 12, color: "var(--gray-200)", fontWeight: 500, lineHeight: 1 }}>{title}</p>
          {shortcut && <p style={{ fontSize: 10, color: "var(--gray-400)", marginTop: 4, lineHeight: 1 }}>{shortcut}</p>}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--primary-700)" }} />
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
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34, height: 34,
          borderRadius: "50% 50% 50% 2px",
          fontSize: 13, fontWeight: 700,
          color: "#04141a",
          border: "2px solid rgba(255,255,255,0.85)",
          boxShadow: isDragging ? "0 8px 24px -4px rgba(0,0,0,0.9)" : "0 6px 18px -4px rgba(0,0,0,0.7)",
          transform: isDragging ? "scale(1.1)" : "scale(1)",
          transition: "transform .15s, box-shadow .15s",
          backgroundColor: pin.text.trim() ? "var(--primary-500)" : "var(--alert-medium)",
          userSelect: "none",
          padding: 0,
        }}
      >
        {index + 1}
      </button>

      {pin.editing && !isDragging && (
        <div
          style={{
            position: "absolute",
            width: 280,
            zIndex: 40,
            padding: 16,
            borderRadius: 16,
            background: "color-mix(in srgb, var(--primary-900) 92%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary-500) 34%, transparent)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 30px 70px -30px rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            ...(popupLeft ? { right: "calc(100% + 12px)" } : { left: "calc(100% + 12px)" }),
            ...(popupUp
              ? { bottom: "50%", transform: "translateY(50%)" }
              : { top: "50%", transform: "translateY(-50%)" }),
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-300)" }}>
              Ponto {index + 1}
            </span>
            <button
              type="button"
              onClick={onRemove}
              style={{ display: "inline-flex", alignItems: "center", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--error-medium)", background: "none", border: 0, padding: 0, cursor: "pointer", transition: ".16s" }}
            >
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
            className="placeholder-gray-500 focus:outline-none"
            style={{
              userSelect: "text",
              width: "100%",
              minHeight: 88,
              padding: "11px 13px",
              borderRadius: 12,
              border: "1px solid var(--gray-700)",
              background: "color-mix(in srgb, var(--primary-900) 60%, transparent)",
              color: "var(--gray-100)",
              fontSize: 14,
              lineHeight: 1.5,
              resize: "none",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--gray-500)", flexWrap: "wrap" }}>
            <span><b style={{ color: "var(--gray-300)", fontWeight: 600 }}>Enter</b> salva</span>
            <span style={{ color: "var(--gray-600)" }}>·</span>
            <span><b style={{ color: "var(--gray-300)", fontWeight: 600 }}>Shift+Enter</b> nova linha</span>
          </div>
        </div>
      )}
    </div>
  );
}
