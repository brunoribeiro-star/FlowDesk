"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";

import LogoFlowDeskIcon from "@/components/LogoFlowDeskIcon";

import {
  Home,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckSquare,
  DollarSign,
  ScrollText,
  Wallet,
} from "lucide-react";

interface SidebarProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SIDEBAR_KEY = "sidebar_open";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Sidebar({ defaultOpen = false, onOpenChange }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [transitionsReady, setTransitionsReady] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    setOpen(stored !== null ? stored === "true" : defaultOpen);

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionsReady(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    function handleDefaultChanged(e: Event) {
      const val = (e as CustomEvent<boolean>).detail;
      setOpen(val);
      localStorage.setItem(SIDEBAR_KEY, String(val));
    }
    window.addEventListener("flowdesk:sidebar-default-changed", handleDefaultChanged);
    return () => window.removeEventListener("flowdesk:sidebar-default-changed", handleDefaultChanged);
  }, []);

  const mainLinks = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Projetos", href: "/dashboard/projetos", icon: FolderKanban },
    { name: "Clientes", href: "/dashboard/clientes", icon: Users },
    { name: "Briefings", href: "/dashboard/briefings", icon: ClipboardList },
    { name: "Propostas", href: "/dashboard/propostas", icon: FileText },
    { name: "Contratos", href: "/dashboard/contratos", icon: ScrollText },
    { name: "Time Tracker", href: "/dashboard/cronometro", icon: Clock },
    { name: "Tarefas", href: "/dashboard/tarefas", icon: CheckSquare },
    { name: "Pagamentos", href: "/dashboard/pagamentos", icon: DollarSign },
    { name: "Financeiro", href: "/dashboard/financeiro", icon: Wallet },
  ];

  const utilLinks = [
    { name: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
    { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
  ];

  const toggleSidebar = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erro ao sair: " + error.message);
    else router.push("/login");
  }

  const linkClass = (active: boolean) =>
    clsx(
      "flex items-center px-3 py-2 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors relative group",
      "transition-all duration-300 ease-in-out",
      active && "bg-gradient-to-r from-primary-800 to-primary-600 border-l border-primary-400",
      open ? "gap-3" : "gap-0 justify-center"
    );

  const tooltip = (name: string) => (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-primary-900 border border-primary-700 text-gray-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-xl">
      {name}
    </div>
  );

  return (
    <aside
      className={clsx(
        "relative h-screen bg-primary-800 flex flex-col justify-between",
        transitionsReady && "transition-all duration-300 ease-in-out",
        open ? "w-[230px]" : "w-[68px]"
      )}
    >
      <button
        onClick={toggleSidebar}
        className={clsx(
          "absolute top-6 right-0 translate-x-1/2 z-[50] w-[32px] h-[32px] flex items-center justify-center rounded-lg shadow-md border border-primary-600",
          "bg-primary-100 hover:bg-primary-200 transition-all duration-300 ease-in-out"
        )}
        title={open ? "Fechar menu" : "Abrir menu"}
      >
        {open ? (
          <ChevronLeft size={18} className="text-primary-800" />
        ) : (
          <ChevronRight size={18} className="text-primary-800" />
        )}
      </button>

      <div className="flex flex-col w-full py-5 px-2 overflow-hidden">
        <div className="w-full px-3 mb-5 flex items-center">
          {open ? (
            <span className="block w-full text-primary-100 font-semibold font-dm-sans text-[34px] leading-none select-none">
              FlowDesk
            </span>
          ) : (
            <LogoFlowDeskIcon className="text-primary-100 w-7 h-7" />
          )}
        </div>

        <nav className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-0.5 w-full">
            {mainLinks.map(({ name, href, icon: Icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname?.startsWith("/dashboard") &&
                    !pathname?.startsWith("/dashboard/")
                  : pathname === href;

              return (
                <Link key={name} href={href} className={linkClass(active)}>
                  <Icon size={20} className="text-primary-100 shrink-0" />
                  {open ? (
                    <span className="text-[15px] font-normal leading-none truncate">
                      {name}
                    </span>
                  ) : (
                    tooltip(name)
                  )}
                </Link>
              );
            })}
          </div>

          <div className="w-full h-px bg-primary-600" />

          <div className="flex flex-col gap-0.5 w-full">
            {utilLinks.map(({ name, href, icon: Icon }) => (
              <Link key={name} href={href} className={linkClass(pathname === href)}>
                <Icon size={20} className="text-primary-100 shrink-0" />
                {open ? (
                  <span className="text-[15px] font-normal leading-none truncate">
                    {name}
                  </span>
                ) : (
                  tooltip(name)
                )}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-auto pt-5 w-full">
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center px-3 py-2 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors w-full relative group",
              "transition-all duration-300 ease-in-out",
              open ? "gap-3" : "gap-0 justify-center"
            )}
          >
            <LogOut size={20} className="text-primary-100 shrink-0" />
            {open ? (
              <span className="text-[15px] font-normal leading-none">Sair</span>
            ) : (
              tooltip("Sair")
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
