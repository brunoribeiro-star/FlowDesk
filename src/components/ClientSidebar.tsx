import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import LogoFlowDeskIcon from "@/components/LogoFlowDeskIcon";
import { Home, Package, CheckSquare, ClipboardList, CreditCard, Settings, ChevronLeft, ChevronRight } from "lucide-react";

interface ClientSidebarProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SIDEBAR_KEY = "client_sidebar_open";

export default function ClientSidebar({ defaultOpen = false, onOpenChange }: ClientSidebarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);
  const { pathname } = useRouter();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) setOpen(stored === "true");
  }, []);

  useEffect(() => {
    if (mounted) onOpenChange?.(open);
  }, [open, mounted, onOpenChange]);

  const mainLinks = [
    { name: "Início", href: "/portal/dashboard", icon: Home },
    { name: "Projetos", href: "/portal/projetos", icon: Package },
    { name: "Aprovações", href: "/portal/aprovacoes", icon: CheckSquare },
    { name: "Briefings", href: "/portal/briefings", icon: ClipboardList },
    { name: "Pagamentos", href: "/portal/pagamentos", icon: CreditCard },
  ];

  const utilLinks = [
    { name: "Configurações", href: "/portal/configuracoes", icon: Settings },
  ];

  const toggleSidebar = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/portal/projetos") {
      return pathname === "/portal/projetos" || pathname.startsWith("/portal/projeto/");
    }
    return pathname === href;
  };

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
        "relative h-screen bg-primary-800 border-r border-primary-600 flex flex-col",
        "transition-all duration-300 ease-in-out",
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

      <div className="flex flex-col w-full py-5 px-2 flex-1 overflow-hidden">
        <div className="w-full px-3 mb-5 flex items-center">
          {open ? (
            <span className="block w-full text-primary-100 font-semibold font-dm-sans text-[34px] leading-none select-none">
              FlowDesk
            </span>
          ) : (
            <LogoFlowDeskIcon className="text-primary-100 w-7 h-7" />
          )}
        </div>

        <nav className="flex flex-col gap-0.5 w-full">
          {mainLinks.map(({ name, href, icon: Icon }) => (
            <Link key={name} href={href} className={linkClass(isActive(href))}>
              <Icon size={20} className="text-primary-100 shrink-0" />
              {open ? (
                <span className="text-[15px] font-normal leading-none truncate">{name}</span>
              ) : (
                tooltip(name)
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-5 w-full border-t border-primary-700">
          {utilLinks.map(({ name, href, icon: Icon }) => (
            <Link key={name} href={href} className={linkClass(isActive(href))}>
              <Icon size={20} className="text-primary-100 shrink-0" />
              {open ? (
                <span className="text-[15px] font-normal leading-none truncate">{name}</span>
              ) : (
                tooltip(name)
              )}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
