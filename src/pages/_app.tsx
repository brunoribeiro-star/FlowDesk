import type { AppProps } from "next/app";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/styles/globals.css";

const PROTECTED_ROUTES = ["/dashboard"];

export default function App({ Component, pageProps, router }: AppProps) {
  const isProtected = PROTECTED_ROUTES.some((path) =>
    router.pathname.startsWith(path)
  );

  if (isProtected) {
    return (
      <ProtectedRoute>
        <Component {...pageProps} />
      </ProtectedRoute>
    );
  }

  // Páginas públicas (login, index, etc.)
  return <Component {...pageProps} />;
}
