"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { applyTheme, getStoredTheme, ThemeSlug } from "@/utils/themeLoader";
import clsx from "clsx";

type ThemePreview = {
  slug: ThemeSlug;
  name: string;
  previewBg: string;
  bars: string[];
};

const THEMES: ThemePreview[] = [
  { slug: "default",   name: "Default",   previewBg: "#08222A", bars: ["#D4F2FB", "#A8E4F6", "#1EB6E8"] },
  { slug: "claro",     name: "Claro",     previewBg: "#f1f5f9", bars: ["#64748B", "#475569", "#334155"] },
  { slug: "ayu",       name: "Ayu",       previewBg: "#131922", bars: ["#FFF2D6", "#FFE6B3", "#FFAA33"] },
  { slug: "solarized", name: "Solarized", previewBg: "#073642", bars: ["#E6FAF8", "#7BDED5", "#2AA198"] },
  { slug: "black",     name: "Black",     previewBg: "#111111", bars: ["#E9F6FF", "#96D4FF", "#3EA6FF"] },
  { slug: "dracula",   name: "Dracula",   previewBg: "#282A36", bars: ["#F7F2FF", "#D8C6FF", "#BD93F9"] },
  { slug: "material",  name: "Material",  previewBg: "#1565C0", bars: ["#BBDEFB", "#64B5F6", "#2196F3"] },
  { slug: "tokyo",     name: "Tokyo",     previewBg: "#13151F", bars: ["#C0CAF5", "#7AA2F7", "#9ECE6A"] },
  { slug: "one",       name: "One",       previewBg: "#11131C", bars: ["#5E678B", "#394159", "#232838"] },
  { slug: "lucy",      name: "Lucy",      previewBg: "#111424", bars: ["#5F67B0", "#3A4073", "#222847"] },
];

export default function ThemeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<ThemeSlug>("default");

  useEffect(() => {
    if (open) setSelected(getStoredTheme());
  }, [open]);

  if (!open) return null;

  function handleSelect(slug: ThemeSlug) {
    setSelected(slug);
    applyTheme(slug);
    window.dispatchEvent(new Event("flowdesk:theme-updated"));
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-primary-900 border border-primary-700 shadow-2xl rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 transition-colors"
        >
          <X size={22} />
        </button>

        <h2 className="text-gray-100 text-[20px] font-semibold mb-6">
          Personalizar Tema
        </h2>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {THEMES.map((theme) => (
            <button
              key={theme.slug}
              onClick={() => handleSelect(theme.slug)}
              className={clsx(
                "w-full rounded-xl border px-3 py-3 flex flex-col items-center transition-all",
                selected === theme.slug
                  ? "border-primary-300 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                  : "border-primary-700 hover:border-primary-400 hover:bg-primary-800"
              )}
            >
              <div
                className="w-full rounded-lg px-2 py-2 flex flex-col gap-1"
                style={{ backgroundColor: theme.previewBg }}
              >
                {theme.bars.map((c, i) => (
                  <div key={i} className="h-1.5 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="mt-2 text-[12px] text-gray-200 font-medium">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
