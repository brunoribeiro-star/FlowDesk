"use client";

import { useEffect, useRef, useState } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  // Primary (teal)
  "#06191F", "#08222A", "#0B2F39", "#104253", "#1EB6E8", "#4FC5EB", "#7ED6F1", "#A8E4F6", "#D4F2FB",
  // Secondary (purple)
  "#1B1130", "#251744", "#37245F", "#4E3485", "#7157C5", "#8C77D3", "#A899E0", "#C2B6EB", "#E3DDF8",
  // Third (green)
  "#0C1F1C", "#0E2A26", "#11423A", "#156354", "#18A17E", "#28B994", "#5ED8B7", "#93E6CE", "#C9F4E6",
  // Gray
  "#0C1213", "#1D2628", "#2C3A3D", "#4A5C60", "#6D858A", "#94A9AD", "#BCCBCD", "#E2E9EA", "#FFFFFF",
  // Pure + status
  "#000000", "#D32F2F", "#EF5350", "#F57C00", "#FFA726", "#388E3C", "#66BB6A", "#FFEB3B", "#FF5722",
];

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value);
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

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  }

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hexInput);

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
        <span className="text-[13px] text-gray-300 font-mono pr-1 uppercase">{value}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-[9999] bg-primary-900 border border-primary-700 rounded-xl shadow-2xl p-3 w-[244px]">
          <div className="grid grid-cols-9 gap-1.5 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setHexInput(color);
                  setOpen(false);
                }}
                className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  outline: value.toLowerCase() === color.toLowerCase()
                    ? "2px solid var(--primary-500)"
                    : "2px solid transparent",
                  outlineOffset: "2px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                title={color}
              />
            ))}
          </div>

          <div className="border-t border-primary-700 pt-3 flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md border border-primary-600 flex-shrink-0"
              style={{ backgroundColor: isValidHex ? hexInput : value }}
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
