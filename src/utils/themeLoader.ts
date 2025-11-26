export type ThemeSlug =
  | "default"
  | "claro"
  | "ayu"
  | "solarized"
  | "black"
  | "dracula"
  | "material"
  | "tokyo"
  | "one"
  | "lucy";

const THEME_STORAGE_KEY = "flowdesk_theme"; // CORRIGIDO p/ usar o mesmo nome do _app.tsx

export const THEME_FILES: Record<ThemeSlug, string> = {
  default: "/styles/themes/default.css",
  claro: "/styles/themes/claro.css",
  ayu: "/styles/themes/ayu.css",
  solarized: "/styles/themes/solarized.css",
  black: "/styles/themes/black.css",
  dracula: "/styles/themes/dracula.css",
  material: "/styles/themes/material.css",
  tokyo: "/styles/themes/tokyo.css",
  one: "/styles/themes/one.css",
  lucy: "/styles/themes/lucy.css",
};

export function getStoredTheme(): ThemeSlug {
  if (typeof window === "undefined") return "default";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeSlug | null;
  if (stored && stored in THEME_FILES) {
    return stored;
  }
  return "default";
}

export function applyTheme(slug: ThemeSlug) {
  if (typeof document === "undefined") return;

  const href = THEME_FILES[slug];

  // 🔥 Usa o MESMO ID que seu _app.tsx
  let link = document.getElementById("flowdesk-theme") as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.id = "flowdesk-theme";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  link.href = href;

  // 🔥 Salva exatamente como seu _app.tsx espera:
  window.localStorage.setItem(THEME_STORAGE_KEY, slug);

  // opcional para CSS global
  document.documentElement.setAttribute("data-theme", slug);
}

export function initThemeOnce() {
  if (typeof window === "undefined") return;
  const slug = getStoredTheme();
  applyTheme(slug);
}
