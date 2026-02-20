import type { AppProps } from "next/app";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/styles/globals.css";
import { useEffect } from "react";

const PROTECTED_ROUTES = ["/dashboard"];

export default function App({ Component, pageProps, router }: AppProps) {
  const isProtected = PROTECTED_ROUTES.some((path) =>
    router.pathname.startsWith(path)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadTheme = () => {
      const selectedTheme =
        localStorage.getItem("flowdesk_theme") || "default";

      const old = document.getElementById("flowdesk-theme");
      if (old) old.remove();

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "flowdesk-theme";

      link.href = `/styles/themes/${selectedTheme}.css`;

      document.head.appendChild(link);
    };

    loadTheme();

    const handler = () => loadTheme();

    window.addEventListener("flowdesk:theme-updated", handler);

    return () =>
      window.removeEventListener("flowdesk:theme-updated", handler);
  }, []);

  if (isProtected) {
    return (
      <ProtectedRoute>
        <Component {...pageProps} />
      </ProtectedRoute>
    );
  }

  return <Component {...pageProps} />;
}