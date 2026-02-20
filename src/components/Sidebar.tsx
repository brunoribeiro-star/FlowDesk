"use client";

import { useState, useEffect } from "react";
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
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckSquare,
  DollarSign,
} from "lucide-react";

interface SidebarProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function Sidebar({ defaultOpen = false, onOpenChange }: SidebarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const mainLinks = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Projetos", href: "/dashboard/projetos", icon: FolderKanban },
    { name: "Clientes", href: "/dashboard/clientes", icon: Users },
    { name: "Templates", href: "/dashboard/templates", icon: LayoutTemplate },
    { name: "Time Tracker", href: "/dashboard/cronometro", icon: Clock },
    { name: "Tarefas", href: "/dashboard/tarefas", icon: CheckSquare },
    { name: "Pagamentos", href: "/dashboard/pagamentos", icon: DollarSign },
  ];

  const utilLinks = [
    { name: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
    { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
  ];

  const toggleSidebar = () => setOpen((prev) => !prev);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erro ao sair: " + error.message);
    else router.push("/login");
  }

  return (
    <aside
      className={clsx(
        "relative h-screen bg-primary-800 border-r border-primary-600 flex flex-col justify-between",
        "transition-all duration-300 ease-in-out",
        open ? "w-[250px]" : "w-[78px]"
      )}
    >
      <button
        onClick={toggleSidebar}
        className={clsx(
          "absolute top-6 -right-[18px] z-[50] w-[36px] h-[36px] flex items-center justify-center rounded-lg shadow-md border border-primary-600",
          "bg-primary-100 hover:bg-primary-200 transition-all duration-300 ease-in-out"
        )}
        title={open ? "Fechar menu" : "Abrir menu"}
      >
        {open ? (
          <ChevronLeft size={20} className="text-primary-800" />
        ) : (
          <ChevronRight size={20} className="text-primary-800" />
        )}
      </button>

      <div
        className={clsx(
          "flex flex-col w-full py-6 px-2 overflow-x-visible",
          open ? "overflow-y-auto" : "overflow-visible"
        )}
      >

        <div className="w-full px-4 mb-6 flex items-center">
          {open ? (
            <span className="block w-full text-primary-100 font-semibold font-dm-sans text-[40px] leading-none select-none">
              FlowDesk
            </span>
          ) : (
            <LogoFlowDeskIcon className="text-primary-100 w-8 h-8" />
          )}
        </div>

        <nav className="flex flex-col gap-8 w-full">
          <div className="flex flex-col gap-2 w-full">
            {mainLinks.map(({ name, href, icon: Icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname?.startsWith("/dashboard") &&
                    !pathname?.startsWith("/dashboard/")
                  : pathname === href;

              return (
                <Link
                  key={name}
                  href={href}
                  className={clsx(
                    "flex items-center px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors relative group",
                    "transition-all duration-300 ease-in-out",
                    active && "bg-gradient-to-r from-primary-800 to-primary-600 border-l border-primary-400",
                    open ? "gap-3" : "gap-0 justify-center"
                  )}
                >
                  <Icon size={24} className="text-primary-100" />
                  {open ? (
                    <span className="text-[18px] font-normal leading-none">
                      {name}
                    </span>
                  ) : (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 border border-primary-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      {name}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="w-full h-px bg-primary-600" />

          <div className="flex flex-col gap-2 w-full">
            {utilLinks.map(({ name, href, icon: Icon }) => (
              <Link
                key={name}
                href={href}
                className={clsx(
                  "flex items-center px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors relative group",
                  "transition-all duration-300 ease-in-out",
                  pathname === href &&
                    "bg-gradient-to-r from-primary-800 to-primary-600 border-l border-primary-400",
                  open ? "gap-3" : "gap-0 justify-center"
                )}
              >
                <Icon size={24} className="text-primary-100" />
                {open ? (
                  <span className="text-[18px] font-normal leading-none">
                    {name}
                  </span>
                ) : (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 border border-primary-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {name}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-auto pt-6 w-full">
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors w-full relative group",
              "transition-all duration-300 ease-in-out",
              open ? "gap-3" : "gap-0 justify-center"
            )}
          >
            <LogOut size={24} className="text-primary-100" />
            {open ? (
              <span className="text-[18px] font-normal leading-none">
                Sair
              </span>
            ) : (
              <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 border border-primary-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                Sair
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}