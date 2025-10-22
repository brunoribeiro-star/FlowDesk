"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // ✅ substitui useRouter
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";

interface SidebarProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function Sidebar({ defaultOpen = false, onOpenChange }: SidebarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname(); // ✅ captura rota atual dinamicamente
  const router = useRouter();

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const mainLinks = [
    { name: "Home", href: "/dashboard", icon: "/home.svg" },
    { name: "Projetos", href: "/dashboard/projetos", icon: "/projetos.svg" },
    { name: "Clientes", href: "/dashboard/clientes", icon: "/clientes.svg" },
    { name: "Templates", href: "/dashboard/templates", icon: "/templates.svg" },
  ];

  const utilLinks = [
    { name: "Relatórios", href: "/dashboard/relatorios", icon: "/relatorios.svg" },
    { name: "Configurações", href: "/dashboard/configuracoes", icon: "/configuracoes.svg" },
  ];

  const toggleSidebar = () => setOpen((prev) => !prev);

  // === Logout ===
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erro ao sair: " + error.message);
    else router.push("/login");
  }

  return (
    <aside
      className={clsx(
        "relative h-screen bg-primary-800 border-r border-primary-600 flex flex-col justify-between transition-all duration-300 ease-out",
        open ? "w-[250px]" : "w-fit"
      )}
    >
      {/* === Botão de abrir/fechar === */}
      <button
        onClick={toggleSidebar}
        className={clsx(
          "absolute top-6 -right-[18px] z-[50] w-[36px] h-[36px] flex items-center justify-center rounded-lg shadow-md border border-primary-600 transition-all duration-300 ease-out",
          "bg-primary-100 hover:bg-primary-200"
        )}
        title={open ? "Fechar menu" : "Abrir menu"}
      >
        <Image
          src={open ? "/seta-sidebar-left.svg" : "/seta-sidebar-right.svg"}
          alt="Toggle Sidebar"
          width={20}
          height={20}
          className="transition-transform duration-300 ease-out"
        />
      </button>

      {/* === Conteúdo === */}
      <div className="flex flex-col w-full py-6 px-2 overflow-y-auto overflow-x-visible">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src={open ? "/logo.svg" : "/logo-closed.svg"}
            alt="FlowDesk Logo"
            width={open ? 150 : 40}
            height={40}
            className="transition-all duration-300 ease-out"
          />
        </div>

        {/* Links principais */}
        <nav className="flex flex-col gap-8 w-full">
          <div className="flex flex-col gap-2 w-full">
            {mainLinks.map((link) => {
              // ✅ Home ativo em /dashboard e todas as subrotas diretas
              const active =
                link.href === "/dashboard"
                  ? pathname?.startsWith("/dashboard") && !pathname?.startsWith("/dashboard/")
                  : pathname === link.href;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors w-full",
                    active
                      ? "bg-gradient-to-r from-primary-800 to-primary-600 border-l border-primary-400"
                      : ""
                  )}
                >
                  <Image src={link.icon} alt={link.name} width={24} height={24} />
                  {open && <span className="text-[18px] font-normal leading-none">{link.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Divisor */}
          <div className="w-full h-px bg-primary-600" />

          {/* Links utilitários */}
          <div className="flex flex-col gap-2 w-full">
            {utilLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors w-full",
                  pathname === link.href
                    ? "bg-gradient-to-r from-primary-800 to-primary-600 border-l border-primary-400"
                    : ""
                )}
              >
                <Image src={link.icon} alt={link.name} width={24} height={24} />
                {open && <span className="text-[18px] font-normal leading-none">{link.name}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* === Logout === */}
        <div className="mt-auto pt-6 w-full">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors w-full"
          >
            <Image src="/logout.svg" alt="Sair/Logout" width={24} height={24} />
            {open && <span className="text-[18px] font-normal leading-none">Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
