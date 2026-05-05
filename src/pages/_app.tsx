import Head from "next/head";
import type { AppProps } from "next/app";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Zap } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";

const PROTECTED_ROUTES = ["/dashboard", "/onboarding", "/portal"];

function PageContent({ Component, pageProps, pathname }: { Component: any; pageProps: any; pathname: string }) {
  const { loading, user } = useAuth();
  const router = useRouter();
  const subscription = useSubscription();

  const isProtected = PROTECTED_ROUTES.some((path) => pathname.startsWith(path))
    && pathname !== "/portal/login"
    && pathname !== "/portal/[token]";

  const isDashboard = pathname.startsWith("/dashboard");
  // Configuracoes is always accessible so the user can subscribe
  const isConfiguracoes = pathname.startsWith("/dashboard/configuracoes");

  const hasValidSubscription =
    !!subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date();

  const isTrialExpired =
    isDashboard &&
    !isConfiguracoes &&
    !!user &&
    !subscription.loading &&
    !subscription.isTrialActive &&
    !hasValidSubscription;

  useEffect(() => {
    if (!loading && isProtected && !user) {
      if (pathname.startsWith("/portal")) {
        router.replace(`/portal/login`);
      } else {
        router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      }
    }
  }, [loading, user, isProtected, router, pathname]);

  if (isProtected && (loading || (isDashboard && !!user && subscription.loading))) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col items-center text-center gap-7">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={130} height={34} priority />

          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)] flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Zap size={26} className="text-amber-400" />
            </div>

            <div>
              <h1 className="text-[20px] font-bold text-gray-100 mb-2">Período de teste encerrado</h1>
              <p className="text-[14px] text-gray-400 leading-relaxed">
                Seus 7 dias gratuitos chegaram ao fim. Escolha um plano para continuar usando o FlowDesk e não perder seus projetos e dados.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => router.push("/subscribe")}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[15px] transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                Ver planos e assinar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { supabase } = await import("@/lib/supabaseClient");
                  await supabase.auth.signOut();
                  router.replace("/login");
                }}
                className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-300 text-[13px] transition-colors"
              >
                Sair da conta
              </button>
            </div>
          </div>
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
    <>
      <Head>
        <title>FlowDesk - Gestão de Projetos para Freelancers</title>

        <meta
          name="description"
          content="Gerencie projetos, tarefas, clientes e colaboradores em um único lugar. FlowDesk é a plataforma completa para freelancers."
        />

        <link rel="icon" href="/favicon-light.png" />
        <link rel="icon" href="/favicon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon-dark.png" media="(prefers-color-scheme: dark)" />

        <meta property="og:title" content="FlowDesk - Gestão de Projetos para Freelancers" />
        <meta
          property="og:description"
          content="Gerencie projetos, tarefas, clientes e colaboradores em um único lugar. FlowDesk é a plataforma completa para freelancers."
        />
        <meta property="og:image" content="https://app.oflowdesk.com/social-preview.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.oflowdesk.com" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FlowDesk - Gestão de Projetos para Freelancers" />
        <meta
          name="twitter:description"
          content="Gerencie projetos, tarefas, clientes e colaboradores em um único lugar. FlowDesk é a plataforma completa para freelancers."
        />
        <meta name="twitter:image" content="https://app.oflowdesk.com/social-preview.jpg" />
      </Head>

      <AuthProvider>
        {progress && (
          <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-primary-500 page-progress-bar" />
        )}
        <PageContent Component={Component} pageProps={pageProps} pathname={router.pathname} />
        <UpgradeModal />
      </AuthProvider>
    </>
  );
}