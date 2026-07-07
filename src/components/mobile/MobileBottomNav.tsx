"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import MobileNavSheet, { type MobileNavSheetItem } from "./MobileNavSheet";

import {
  Home,
  FolderKanban,
  Users,
  Wallet,
  ClipboardList,
  FileText,
  ScrollText,
  Clock,
  CheckSquare,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Pencil,
  SlidersHorizontal,
  Crown,
  MoreHorizontal,
} from "lucide-react";

type GroupId = "projetos" | "financeiro" | "clientes" | "mais";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erro ao sair: " + error.message);
    else router.push("/login");
  }

  const groups: Record<GroupId, { name: string; items: MobileNavSheetItem[]; matches: string[] }> = {
    projetos: {
      name: "Projetos",
      matches: ["/dashboard/projetos", "/dashboard/tarefas", "/dashboard/cronometro"],
      items: [
        { name: "Projetos", href: "/dashboard/projetos", icon: FolderKanban },
        { name: "Tarefas", href: "/dashboard/tarefas", icon: CheckSquare },
        { name: "Time Tracker", href: "/dashboard/cronometro", icon: Clock },
      ],
    },
    financeiro: {
      name: "Financeiro",
      matches: ["/dashboard/pagamentos", "/dashboard/financeiro"],
      items: [
        { name: "Pagamentos", href: "/dashboard/pagamentos", icon: DollarSign },
        { name: "Financeiro", href: "/dashboard/financeiro", icon: Wallet },
      ],
    },
    clientes: {
      name: "Clientes",
      matches: ["/dashboard/clientes", "/dashboard/briefings", "/dashboard/propostas", "/dashboard/contratos"],
      items: [
        { name: "Clientes", href: "/dashboard/clientes", icon: Users },
        { name: "Briefings", href: "/dashboard/briefings", icon: ClipboardList },
        { name: "Propostas", href: "/dashboard/propostas", icon: FileText },
        { name: "Contratos", href: "/dashboard/contratos", icon: ScrollText },
      ],
    },
    mais: {
      name: "Mais",
      matches: ["/dashboard/relatorios", "/dashboard/configuracoes", "/dashboard/tema"],
      items: [
        { name: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
        { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
        { name: "Editar perfil", href: "/dashboard/configuracoes", icon: Pencil },
        { name: "Personalizar tema", href: "/dashboard/tema", icon: SlidersHorizontal },
        { name: "Assinatura", href: "/dashboard/configuracoes?tab=assinatura", icon: Crown },
        { name: "Sair da plataforma", icon: LogOut, danger: true, onClick: handleLogout },
      ],
    },
  };

  const isHomeActive = pathname === "/dashboard";
  const isGroupActive = (id: GroupId) =>
    groups[id].matches.some((m) => pathname?.startsWith(m));

  const tabClass = (active: boolean) =>
    clsx(
      "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-full transition-colors",
      active ? "text-primary-900" : "text-primary-200"
    );

  return (
    <>
      <nav
        className="lg:hidden fixed left-0 right-0 bottom-0 z-[70] flex justify-center px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
      >
        <div
          className="flex items-center gap-1 w-full max-w-md h-[64px] px-2 rounded-full border border-primary-600 bg-primary-800 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={tabClass(isHomeActive)}
          >
            <span
              className={clsx(
                "grid place-items-center w-10 h-10 rounded-full transition-colors",
                isHomeActive && "bg-primary-500"
              )}
            >
              <Home size={20} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpenGroup("projetos")}
            className={tabClass(isGroupActive("projetos"))}
          >
            <span
              className={clsx(
                "grid place-items-center w-10 h-10 rounded-full transition-colors",
                isGroupActive("projetos") && "bg-primary-500"
              )}
            >
              <FolderKanban size={20} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpenGroup("financeiro")}
            className={tabClass(isGroupActive("financeiro"))}
          >
            <span
              className={clsx(
                "grid place-items-center w-10 h-10 rounded-full transition-colors",
                isGroupActive("financeiro") && "bg-primary-500"
              )}
            >
              <Wallet size={20} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpenGroup("clientes")}
            className={tabClass(isGroupActive("clientes"))}
          >
            <span
              className={clsx(
                "grid place-items-center w-10 h-10 rounded-full transition-colors",
                isGroupActive("clientes") && "bg-primary-500"
              )}
            >
              <Users size={20} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpenGroup("mais")}
            className={tabClass(isGroupActive("mais"))}
          >
            <span
              className={clsx(
                "grid place-items-center w-10 h-10 rounded-full transition-colors",
                isGroupActive("mais") && "bg-primary-500"
              )}
            >
              <MoreHorizontal size={20} />
            </span>
          </button>
        </div>
      </nav>

      {openGroup && (
        <MobileNavSheet
          title={groups[openGroup].name}
          items={groups[openGroup].items}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </>
  );
}
