"use client";

import dynamic from "next/dynamic";
import type { EventData, Step } from "react-joyride";
import { usePageTour } from "@/hooks/usePageTour";

const Joyride = dynamic(
  () => import("react-joyride").then((mod) => ({ default: mod.Joyride })),
  { ssr: false }
);

const BASE_STYLES = {
  tooltip: {
    borderRadius: "16px",
    border: "1px solid var(--primary-600, #1a4f63)",
    padding: "24px",
    maxWidth: "360px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    backgroundColor: "var(--primary-800, #0d3340)",
  } as React.CSSProperties,
  tooltipTitle: {
    fontSize: "15px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "var(--gray-100, #f1f5f9)",
  } as React.CSSProperties,
  tooltipContent: {
    fontSize: "13px",
    lineHeight: "1.65",
    color: "var(--gray-300, #cbd5e1)",
    padding: "0",
  } as React.CSSProperties,
  tooltipFooter: { marginTop: "20px" } as React.CSSProperties,
  buttonPrimary: {
    backgroundColor: "var(--primary-500, #1EB6E8)",
    color: "var(--primary-900, #08222A)",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    padding: "8px 18px",
    border: "none",
  } as React.CSSProperties,
  buttonBack: {
    color: "var(--gray-400, #94a3b8)",
    fontSize: "13px",
    marginRight: "4px",
  } as React.CSSProperties,
  buttonSkip: {
    color: "var(--gray-500, #64748b)",
    fontSize: "12px",
  } as React.CSSProperties,
};

interface PageTourProps {
  name: string;
  steps: Step[];
}

import React from "react";

export default function PageTour({ name, steps }: PageTourProps) {
  const { run, finish, skipAll } = usePageTour(name);

  function handleEvent(data: EventData) {
    const { status, action } = data;
    if (status === "finished") { finish(); return; }
    if (status === "skipped") {
      if (action === "skip") skipAll();
      else finish();
    }
  }

  if (typeof window === "undefined") return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        skipBeacon: true,
        skipScroll: true,
        showProgress: true,
        overlayClickAction: false,
        buttons: ["back", "primary", "skip"],
        primaryColor: "var(--primary-500, #1EB6E8)",
        backgroundColor: "var(--primary-800, #0d3340)",
        textColor: "var(--gray-100, #f1f5f9)",
        overlayColor: "rgba(0, 0, 0, 0.6)",
        spotlightRadius: 12,
        offset: 16,
      }}
      locale={{
        back: "Anterior",
        close: "Fechar",
        last: "Entendido!",
        next: "Próximo",
        skip: "Pular todos os tutoriais",
        nextWithProgress: "Próximo ({current} de {total})",
      }}
      styles={BASE_STYLES}
    />
  );
}
