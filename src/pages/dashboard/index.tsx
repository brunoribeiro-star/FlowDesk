"use client";

import { useMemo, useState, useEffect, KeyboardEvent, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";

import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";

const WEEKS_LABELS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];

export default function DashboardHome() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [projetos, setProjetos] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [heightsCurrent, setHeightsCurrent] = useState<number[]>([0, 0, 0, 0]);
  const [heightsLast, setHeightsLast] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    function handleUserUpdated(event: any) {
      const updatedUser = event.detail?.user;
      if (updatedUser) setUser(updatedUser);
    }
    window.addEventListener("flowdesk:user-updated", handleUserUpdated as any);
    return () =>
      window.removeEventListener(
        "flowdesk:user-updated",
        handleUserUpdated as any
      );
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const loggedUser = userData?.user;

      if (!loggedUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(loggedUser);

      const { data: projData } = await supabase
        .from("projetos")
        .select("*")
        .eq("user_id", loggedUser.id)
        .order("created_at", { ascending: false });

      const { data: atvData } = await supabase
        .from("atividades")
        .select("*")
        .eq("user_id", loggedUser.id)
        .order("created_at", { ascending: false })
        .limit(30);

      const { data: payData } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("user_id", loggedUser.id);

      const { data: tasksData } = await supabase
        .from("tasks")
        .select(`*, projetos!inner(user_id)`)
        .eq("projetos.user_id", loggedUser.id);

      setProjetos(projData || []);
      setAtividades(atvData || []);
      setPagamentos(payData || []);
      setTasks(tasksData || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const weeklyCurrent = useMemo(
    () => buildWeeklyRevenue(pagamentos, now),
    [pagamentos]
  );
  const weeklyLast = useMemo(
    () => buildWeeklyRevenue(pagamentos, prevMonth),
    [pagamentos]
  );
  const maxValue = Math.max(...weeklyCurrent, ...weeklyLast, 1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHeightsCurrent(weeklyCurrent.map((v) => v / maxValue));
      setHeightsLast(weeklyLast.map((v) => v / maxValue));
    }, 80);

    return () => clearTimeout(timeout);
  }, [weeklyCurrent, weeklyLast, maxValue]);

  const faturamentoMes = toCurrency(
    weeklyCurrent.reduce((acc, v) => acc + v, 0)
  );

  const projetosAtivos = useMemo(
    () => projetos.filter((p) => p.status === "Em andamento").length,
    [projetos]
  );

  const projetosConcluidos = useMemo(
    () => projetos.filter((p) => p.status === "Concluído").length,
    [projetos]
  );

  const pagamentosPendentesTotal = useMemo(() => {
    const pendentes = pagamentos.filter((p) => {
      if (!p.status) return true;
      const s = String(p.status).toLowerCase();
      return s !== "pago" && s !== "concluido" && s !== "recebido";
    });
    return pendentes.reduce((acc, p) => acc + Number(p.valor ?? 0), 0);
  }, [pagamentos]);

  const tarefasVencendo = useMemo(() => {
    const now = new Date();
    const limit = 2 * 24 * 60 * 60 * 1000;

    return tasks.filter((t) => {
      if (t.concluida) return false;
      const date = t.due_date || t.data_limite;
      if (!date) return false;

      const d = new Date(date);
      if (isNaN(d.getTime())) return false;

      const diff = d.getTime() - now.getTime();
      return diff >= 0 && diff <= limit;
    }).length;
  }, [tasks]);

  const METRICS = [
    {
      id: "projAtivos",
      icon: FolderKanban,
      label: "Projetos ativos",
      value:
        projetosAtivos === 0
          ? "Nenhum ativo"
          : `${projetosAtivos} projeto${projetosAtivos > 1 ? "s" : ""}`,
      onClick: () => router.push("/dashboard/projetos"),
    },
    {
      id: "projConcluidos",
      icon: CheckCircle2,
      label: "Projetos concluídos",
      value:
        projetosConcluidos === 0
          ? "Nenhum concluído"
          : `${projetosConcluidos} projeto${projetosConcluidos > 1 ? "s" : ""}`,
      onClick: () => router.push("/dashboard/projetos"),
    },
    {
      id: "tarefas",
      icon: AlertCircle,
      label: "Tarefas vencendo",
      value:
        tarefasVencendo === 0
          ? "Nenhuma"
          : `${tarefasVencendo} tarefa${tarefasVencendo > 1 ? "s" : ""}`,
      onClick: () => router.push("/dashboard/tarefas"),
    },
    {
      id: "pay",
      icon: Wallet,
      label: "Pagamentos a receber",
      value: toCurrency(pagamentosPendentesTotal),
      onClick: () => router.push("/dashboard/pagamentos"),
    },
  ];

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const displayName =
    user?.user_metadata?.nome ||
    user?.email?.split("@")[0] ||
    "Usuário";

  function handleSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const q = searchTerm.trim();
      if (!q) return;
      router.push(`/dashboard/busca?query=${encodeURIComponent(q)}`);
    }
  }

  function handleEditProfile() {
    setProfileOpen(false);
    router.push("/dashboard/perfil");
  }

  function handleTheme() {
    setProfileOpen(false);
    router.push("/dashboard/tema");
  }

  function handleSignature() {
    setProfileOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading)
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center text-[20px]">
        Carregando...
      </div>
    );

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 w-full overflow-hidden">
        <header className="w-full flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-primary-600">
              <Image
                src={avatarSrc}
                alt="Avatar"
                width={60}
                height={60}
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-[22px] text-gray-200 font-medium">
                Olá, {displayName}!
              </div>
              <div className="text-[14px] text-gray-300">
                Aqui está o resumo do seu trabalho.
              </div>
            </div>
          </div>

          <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 flex items-center gap-3 min-w-0">
            <div className="flex-1 flex items-center gap-3 bg-primary-700 border border-primary-600 rounded-lg px-3 py-2.5 min-w-0">
              <Image src="/buscar.svg" alt="Buscar" width={16} height={16} />
              <input
                placeholder="Buscar por projetos, tarefas, clientes..."
                className="w-full bg-transparent outline-none text-[14px] text-gray-200 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Image
                  src={avatarSrc}
                  alt="Perfil"
                  width={35}
                  height={35}
                  className="rounded-full object-cover border border-primary-600"
                />

                {profileOpen ? (
                  <ChevronUp size={18} className="text-primary-100" />
                ) : (
                  <ChevronDown size={18} className="text-primary-100" />
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-primary-800 border border-primary-600 rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-fade-in">
                  <button
                    className="flex items-center gap-3 text-gray-200 hover:text-primary-100 transition-colors"
                    onClick={handleEditProfile}
                  >
                    <Pencil size={20} className="text-primary-200" />
                    Editar perfil
                  </button>

                  <button
                    className="flex items-center gap-3 text-gray-200 hover:text-primary-100 transition-colors"
                    onClick={handleTheme}
                  >
                    <SlidersHorizontal size={20} className="text-primary-200" />
                    Personalizar tema
                  </button>

                  <button
                    className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300 transition-colors"
                    onClick={handleSignature}
                  >
                    <Crown size={20} />
                    Assinatura
                  </button>

                  <button
                    className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors pt-2"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/login");
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sair da plataforma
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="w-full grid grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={m.onClick}
                className="flex flex-col justify-center items-start gap-2 p-4 rounded-lg bg-primary-800 border border-primary-700 w-full h-full transition-colors cursor-pointer hover:[background:linear-gradient(180deg,var(--primary-500),var(--primary-800))]"
              >
                <m.icon size={24} className="text-primary-200" />
                <div className="text-[13px] text-gray-300">{m.label}</div>
                <div className="text-[22px] text-gray-200 font-semibold">
                  {m.value}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-[1.2fr,0.8fr] gap-4 min-h-0">
            <div className="flex flex-col gap-4 min-h-0">
              <div className="flex-1 flex flex-col rounded-lg bg-primary-800 border border-primary-700 overflow-hidden min-h-0">
                <div className="px-5 py-4 border-b border-primary-700 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="text-[14px] text-gray-300">
                      Faturamento mês atual comparado ao anterior
                    </div>
                    <div className="text-[28px] text-gray-200 font-bold">
                      {faturamentoMes}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-500" />
                      <span className="text-[12px] text-gray-300">
                        Mês atual
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-700" />
                      <span className="text-[12px] text-gray-300">
                        Mês anterior
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 px-5 py-4 flex items-end justify-between min-h-0">
                  {WEEKS_LABELS.map((label, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-end gap-2 flex-1"
                    >
                      <div className="w-full flex items-end justify-center gap-1 h-52">
                        <div
                          className={`rounded-sm transition-all duration-700 ease-out
                          ${
                            heightsLast[idx] === 0
                              ? "border border-primary-700 bg-transparent"
                              : "bg-primary-700"
                          }`}
                          style={{
                            width: "20px",
                            height: `${heightsLast[idx] * 100}%`,
                            opacity: heightsLast[idx] > 0 ? 1 : 0.4,
                          }}
                        ></div>

                        <div
                          className={`
                            rounded-sm bg-primary-500 transition-all duration-700 ease-out
                            ${
                              heightsCurrent[idx] === 0
                                ? "border border-primary-500 bg-transparent"
                                : "bg-primary-500"
                            }
                            `}
                          style={{
                            width: "20px",
                            height: `${heightsCurrent[idx] * 100}%`,
                            opacity: heightsCurrent[idx] > 0 ? 1 : 0.4,
                          }}
                        ></div>
                      </div>

                      <span className="text-[11px] text-gray-400">
                        {label}
                      </span>

                      <span className="text-[12px] text-gray-300">
                        {toCurrency(weeklyCurrent[idx])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push("/dashboard/projetos/novo")}
                  className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-3 text-[18px] font-semibold transition-colors"
                >
                  Novo projeto
                </button>

                <button className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 text-[18px]">
                  Novo briefing
                </button>
              </div>
            </div>

            <div className="h-full rounded-lg bg-primary-800 border border-primary-700 p-5 flex flex-col gap-4 min-h-0">
              <div className="text-[18px] text-gray-200 font-medium">
                Atividades recentes
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {atividades.length > 0 ? (
                  atividades.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-3 border-b border-primary-700 last:border-b-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary-700 border border-primary-600 flex items-center justify-center text-gray-200 text-[18px]">
                        •
                      </div>

                      <div className="flex-1 flex flex-col gap-1">
                        <div className="text-[14px] text-gray-300 font-medium">
                          {a.tipo}
                        </div>

                        <div className="text-[13px] text-gray-400">
                          {a.descricao}
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-400 whitespace-nowrap">
                        {a.created_at
                          ? new Date(a.created_at).toLocaleDateString("pt-BR")
                          : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-[14px] mt-8 text-center">
                    Nenhuma atividade recente
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-500);
          border-radius: 9999px;
          border: 2px solid var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-400);
        }

        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildWeeklyRevenue(payments: any[], refDate: Date): number[] {
  const month = refDate.getMonth();
  const year = refDate.getFullYear();
  const weeks = [0, 0, 0, 0];

  payments.forEach((p) => {
    const rawDate = p.data_pagamento || p.created_at;
    if (!rawDate) return;

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return;

    if (d.getMonth() !== month || d.getFullYear() !== year) return;

    const status = String(p.status ?? "").toLowerCase();
    const pago =
      status === "pago" ||
      status === "concluido" ||
      status === "recebido" ||
      status === "ok";

    if (!pago) return;

    const valor = Number(p.valor ?? 0);
    if (isNaN(valor) || valor <= 0) return;

    const day = d.getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;

    weeks[idx] += valor;
  });

  return weeks;
}