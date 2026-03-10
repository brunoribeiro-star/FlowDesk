import type { AppProps } from "next/app";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PROTECTED_ROUTES = ["/dashboard"];

function PageContent({ Component, pageProps, pathname }: { Component: any; pageProps: any; pathname: string }) {
  const { loading, user } = useAuth();
  const router = useRouter();
  const isProtected = PROTECTED_ROUTES.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!loading && isProtected && !user) {
      router.replace("/login");
    }
  }, [loading, user, isProtected, router]);

  if (isProtected && loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps, router }: AppProps) {
  const [progress, setProgress] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadTheme = () => {
      const selectedTheme = localStorage.getItem("flowdesk_theme") || "default";
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
    return () => window.removeEventListener("flowdesk:theme-updated", handler);
  }, []);

  useEffect(() => {
    const start = () => setProgress(true);
    const end = () => setProgress(false);
    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", end);
    router.events.on("routeChangeError", end);
    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", end);
      router.events.off("routeChangeError", end);
    };
  }, [router.events]);

  return (
    <AuthProvider>
      {progress && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-primary-500 page-progress-bar" />
      )}
      <PageContent Component={Component} pageProps={pageProps} pathname={router.pathname} />
    </AuthProvider>
  );
}