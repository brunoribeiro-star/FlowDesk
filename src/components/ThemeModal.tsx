"use client";

import { X } from "lucide-react";

const THEMES = [
  { id: "claro", label: "Claro" },
  { id: "ayu", label: "Ayu" },
  { id: "solarized", label: "Solarized" },
  { id: "black", label: "Black" },
  { id: "dracula", label: "Dracula" },
  { id: "material", label: "Material" },
  { id: "tokyo", label: "Tokyo" },
  { id: "monokai", label: "Monokai" },
  { id: "gruv", label: "Gruv" },
  { id: "one", label: "One" },
  { id: "min", label: "Min" },
  { id: "lucy", label: "Lucy" },
];

export default function ThemeModal({ open, onClose }: any) {
  if (!open) return null;

  function applyTheme(themeId: string) {
    localStorage.setItem("flowdesk-theme", themeId);

    document.documentElement.className = "";
    document.documentElement.classList.add(`theme-${themeId}`);

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-primary-900 border border-primary-700 shadow-2xl rounded-2xl p-6 animate-fade-in relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-100"
        >
          <X size={22} />
        </button>

        <h2 className="text-gray-100 text-[22px] font-semibold mb-6">
          Personalizar Tema
        </h2>

        <div className="grid grid-cols-3 gap-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className="p-4 bg-primary-800 border border-primary-700 rounded-xl flex flex-col gap-2 hover:border-primary-400 hover:bg-primary-700 transition-all"
            >
              <div className="w-full h-16 rounded-lg bg-primary-700"></div>

              <span className="text-gray-200 text-[15px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}