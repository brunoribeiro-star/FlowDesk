"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { EventData, Step } from "react-joyride";

const Joyride = dynamic(
  () => import("react-joyride").then((mod) => ({ default: mod.Joyride })),
  { ssr: false }
);

const TOUR_KEY = "fd_tour_done";

const STEPS: Step[] = [
  {
    target: "body",
    title: "Bem-vindo ao FlowDesk!",
    content:
      "Vamos fazer um tour rápido pelas principais funcionalidades para você começar com tudo. Leva menos de 2 minutos.",
    placement: "center",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/projetos"]',
    title: "Projetos",
    content:
      "Crie e gerencie seus projetos. Defina título, valor, prazo e cliente — e acompanhe o progresso em tempo real.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/clientes"]',
    title: "Clientes",
    content:
      "Cadastre seus clientes com contato e empresa. Organize-os em um quadro por status: potencial, em negociação, cliente ativo ou inativo.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/briefings"]',
    title: "Briefings",
    content:
      "Crie formulários personalizados para coletar informações antes de iniciar um projeto. Envie por link e acompanhe as respostas.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/propostas"]',
    title: "Propostas",
    content:
      "Monte propostas comerciais com templates prontos, editor de blocos e exportação em PDF para enviar aos clientes.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/contratos"]',
    title: "Contratos",
    content:
      "Gere contratos comerciais completos e exporte em PDF. Proteja seu trabalho antes de começar qualquer projeto.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/cronometro"]',
    title: "Time Tracker",
    content:
      "Registre o tempo trabalhado em cada projeto e tarefa. Controle suas horas para cobrar com mais precisão.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/tarefas"]',
    title: "Tarefas",
    content:
      "Organize as etapas dos projetos em tarefas e subtarefas. Defina prazos, status e acompanhe o que precisa ser feito.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/pagamentos"]',
    title: "Pagamentos",
    content:
      "Controle todos os pagamentos a receber. Saiba exatamente quanto está pendente e o que já entrou no seu caixa.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: 'a[href="/dashboard/relatorios"]',
    title: "Relatórios",
    content:
      "Visualize métricas de desempenho, produtividade e receita para tomar decisões mais inteligentes sobre seu negócio.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: "body",
    title: "Mini-tutoriais por tela",
    content:
      "Cada seção tem um mini-tutorial que aparece automaticamente na primeira visita. Você pode pular qualquer um deles — ou ignorar todos de uma vez clicando em \"Pular todos os tutoriais\".",
    placement: "center",
    skipBeacon: true,
  },
  {
    target: "body",
    title: "Tudo pronto!",
    content:
      "Comece criando seu primeiro projeto ou cadastrando um cliente. Você pode rever qualquer tutorial em Configurações → Aparência.",
    placement: "center",
    skipBeacon: true,
  },
];

const joyrideStyles = {
  tooltip: {
    borderRadius: "16px",
    border: "1px solid var(--primary-600, #1a4f63)",
    padding: "24px",
    maxWidth: "340px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    backgroundColor: "var(--primary-800, #0d3340)",
  } as React.CSSProperties,
  tooltipTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "var(--gray-100, #f1f5f9)",
  } as React.CSSProperties,
  tooltipContent: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "var(--gray-300, #cbd5e1)",
    padding: "0",
  } as React.CSSProperties,
  tooltipFooter: {
    marginTop: "20px",
  } as React.CSSProperties,
  buttonPrimary: {
    backgroundColor: "var(--primary-500, #1EB6E8)",
    color: "var(--primary-900, #08222A)",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    padding: "8px 20px",
    border: "none",
  } as React.CSSProperties,
  buttonBack: {
    color: "var(--gray-400, #94a3b8)",
    fontSize: "14px",
    fontWeight: "500",
    marginRight: "4px",
  } as React.CSSProperties,
  buttonSkip: {
    color: "var(--gray-500, #64748b)",
    fontSize: "13px",
  } as React.CSSProperties,
};

import React from "react";

export default function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      setTimeout(() => setRun(true), 800);
    }

    function handleStart() {
      localStorage.removeItem(TOUR_KEY);
      setRun(false);
      setTimeout(() => setRun(true), 50);
    }

    window.addEventListener("flowdesk:start-tour", handleStart);
    return () => window.removeEventListener("flowdesk:start-tour", handleStart);
  }, []);

  function handleEvent(data: EventData) {
    const { status } = data;
    if (status === "finished" || status === "skipped") {
      localStorage.setItem(TOUR_KEY, "true");
      setRun(false);
    }
  }

  if (!mounted) return null;

  return (
    <Joyride
      steps={STEPS}
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
        overlayColor: "rgba(0, 0, 0, 0.65)",
        spotlightRadius: 12,
        offset: 16,
      }}
      locale={{
        back: "Anterior",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tutorial",
        nextWithProgress: "Próximo ({current} de {total})",
      }}
      styles={joyrideStyles}
    />
  );
}
