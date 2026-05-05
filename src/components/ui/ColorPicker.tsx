"use client";

import { useEffect, useRef, useState } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, max === 0 ? 0 : d / max, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  h /= 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: [r, g, b] = [v, t, p]; break;
    case 1: [r, g, b] = [q, v, p]; break;
    case 2: [r, g, b] = [p, v, t]; break;
    case 3: [r, g, b] = [p, q, v]; break;
    case 4: [r, g, b] = [t, p, v]; break;
    default: [r, g, b] = [v, p, q]; break;
  }
  return "#" + [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"gradient" | "hue" | null>(null);

  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  useEffect(() => {
    if (isValidHex(value)) {
      const [h, s, v] = hexToHsv(value);
      setHue(h);
      setSaturation(s);
      setBrightness(v);
      setHexInput(value.toUpperCase());
    }
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function applyHsv(h: number, s: number, v: number) {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  }

  function handleGradientPointer(e: React.PointerEvent<HTMLDivElement>, type: "down" | "move") {
    if (type === "down") {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDragging.current = "gradient";
    }
    if (isDragging.current !== "gradient") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setSaturation(s);
    setBrightness(v);
    applyHsv(hue, s, v);
  }

  function handleHuePointer(e: React.PointerEvent<HTMLDivElement>, type: "down" | "move") {
    if (type === "down") {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDragging.current = "hue";
    }
    if (isDragging.current !== "hue") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    setHue(h);
    applyHsv(h, saturation, brightness);
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHexInput(val);
    if (isValidHex(val)) {
      const [h, s, v] = hexToHsv(val);
      setHue(h);
      setSaturation(s);
      setBrightness(v);
      onChange(val);
    }
  }

  const hueColor = hsvToHex(hue, 1, 1);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-transparent p-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
      >
        <div
          className="w-7 h-7 rounded-md border border-gray-600 flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="text-[13px] text-gray-300 font-mono pr-1 uppercase">
          {isValidHex(value) ? value.toUpperCase() : hexInput}
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-[9999] bg-primary-900 border border-primary-700 rounded-xl shadow-2xl p-3 w-[240px] flex flex-col gap-3">

          <div
            className="relative w-full h-36 rounded-lg cursor-crosshair select-none touch-none"
            style={{
              background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            onPointerDown={(e) => handleGradientPointer(e, "down")}
            onPointerMove={(e) => handleGradientPointer(e, "move")}
            onPointerUp={() => { isDragging.current = null; }}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${saturation * 100}%`,
                top: `${(1 - brightness) * 100}%`,
                backgroundColor: isValidHex(value) ? value : hueColor,
              }}
            />
          </div>

          <div
            className="relative w-full h-3 rounded-full cursor-pointer select-none touch-none"
            style={{
              background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            onPointerDown={(e) => handleHuePointer(e, "down")}
            onPointerMove={(e) => handleHuePointer(e, "move")}
            onPointerUp={() => { isDragging.current = null; }}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2"
              style={{
                left: `${(hue / 360) * 100}%`,
                backgroundColor: hueColor,
              }}
            />
          </div>

          <div className="flex items-center gap-2 border-t border-primary-700 pt-2">
            <div
              className="w-7 h-7 rounded-md border border-primary-600 flex-shrink-0"
              style={{ backgroundColor: isValidHex(hexInput) ? hexInput : value }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              onFocus={(e) => e.target.select()}
              placeholder="#000000"
              maxLength={7}
              className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-2 py-1.5 text-[12px] font-mono text-gray-200 focus:outline-none focus:border-primary-500 transition-colors uppercase"
            />
          </div>
        </div>
      )}
    </div>
  );
}
