"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { applyTheme, getStoredTheme, ThemeSlug } from "@/utils/themeLoader";

type ThemePreview = {
  slug: ThemeSlug;
  name: string;
  previewBg: string;
  bars: string[];
};

const THEMES: ThemePreview[] = [
  { slug: "default", name: "Default", previewBg: "#08222A", bars: ["#D4F2FB", "#A8E4F6", "#1EB6E8"] },
  { slug: "claro", name: "Claro", previewBg: "#f1f5f9", bars: ["#64748B", "#475569", "#334155"] },
  { slug: "ayu", name: "Ayu", previewBg: "#131922", bars: ["#FFF2D6", "#FFE6B3", "#FFAA33"] },
  { slug: "solarized", name: "Solarized", previewBg: "#073642", bars: ["#E6FAF8", "#7BDED5", "#2AA198"] },
  { slug: "black", name: "Black", previewBg: "#111111", bars: ["#E9F6FF", "#96D4FF", "#3EA6FF"] },
  { slug: "dracula", name: "Dracula", previewBg: "#282A36", bars: ["#F7F2FF", "#D8C6FF", "#BD93F9"] },
  { slug: "material", name: "Material", previewBg: "#1565C0", bars: ["#BBDEFB", "#64B5F6", "#2196F3"] },
  { slug: "tokyo", name: "Tokyo", previewBg: "#13151F", bars: ["#C0CAF5", "#7AA2F7", "#9ECE6A"] },
  { slug: "one", name: "One", previewBg: "#11131C", bars: ["#5E678B", "#394159", "#232838"] },
  { slug: "lucy", name: "Lucy", previewBg: "#111424", bars: ["#5F67B0", "#3A4073", "#222847"] },
];

export default function ThemePage() {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<ThemeSlug>("default");

  useEffect(() => {
    const initial = getStoredTheme();
    setSelectedSlug(initial);
  }, []);

  const selectedTheme = THEMES.find(t => t.slug === selectedSlug)!;
  const others = THEMES.filter(t => t.slug !== selectedSlug);

  function handleSelect(slug: ThemeSlug) {
    setSelectedSlug(slug);

    applyTheme(slug);

    window.dispatchEvent(new Event("flowdesk:theme-updated"));
  }

  return (
    <div className="h-full w-full bg-primary-900 text-gray-100 flex flex-col overflow-y-auto overflow-x-hidden">

      <header className="w-full px-4 sm:px-6 pt-6 flex items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-full
                     bg-primary-800 border border-primary-700 hover:bg-primary-700"
        >
          <ArrowLeft size={18} className="text-primary-100" />
          <span className="text-[14px] text-gray-100">Voltar</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 lg:py-0 lg:pb-10">
        <h1 className="text-[22px] sm:text-[26px] font-semibold text-gray-100 mb-6 text-center">
          Personalizar Tema
        </h1>

        <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 max-w-4xl w-full">

          {others.map(theme => (
            <ThemeCard
              key={theme.slug}
              theme={theme}
              selected={false}
              onSelect={() => handleSelect(theme.slug)}
            />
          ))}

          <div className="col-span-full">
            <ThemeCard
              theme={selectedTheme}
              selected
              onSelect={() => handleSelect(selectedTheme.slug)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemePreview;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full rounded-2xl border px-4 py-4 flex flex-col items-center transition-all",
        selected
          ? "border-primary-300 scale-[1.03] shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
          : "border-primary-700 hover:border-primary-400 hover:bg-primary-700/50"
      )}
    >
      <div
        className="w-full rounded-xl px-3 py-3 flex flex-col gap-1.5"
        style={{ backgroundColor: theme.previewBg }}
      >
        {theme.bars.map((c, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <span className="mt-3 text-[14px] text-gray-100 font-medium">
        {theme.name}
      </span>
    </button>
  );
}
