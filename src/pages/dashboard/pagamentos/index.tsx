"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Projeto = {
  id: string;
  titulo: string;
  cliente_id: string | null;
  clientes?: {
    id: string;
    nome: string | null;
    empresa: string | null;
    foto_url?: string | null;
  } | null;
};

type Pagamento = {
  id: string;
  user_id: string;
  projeto_id: string | null;
  valor: number | null;
  status: string | null;
  data_pagamento: string | null;
  data_vencimento?: string | null;
  created_at: string;
};

type FiltroStatus = "" | "pendentes" | "pagos";

function formatarDataCurta(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function tempoRelativo(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras > 1 ? "s" : ""}`;
  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 30) return `há ${diffDias} dia${diffDias > 1 ? "s" : ""}`;
  const diffMeses = Math.floor(diffDias / 30);
  return `há ${diffMeses} mês${diffMeses > 1 ? "es" : ""}`;
}

function classificarPagamento(p: Pagamento): "pago" | "pendente" | "atrasado" {
  const raw = String(p.status || "").toLowerCase();
  const isPago =
    raw === "pago" ||
    raw === "concluido" ||
    raw === "recebido" ||
    raw === "ok";

  if (isPago) return "pago";

  const venc = p.data_vencimento;
  if (!venc) return "pendente";

  const hoje = new Date();
  const d = new Date(venc + "T00:00:00");
  if (isNaN(d.getTime())) return "pendente";

  if (d.getTime() < new Date(hoje.toISOString().slice(0, 10) + "T00:00:00").getTime())
    return "atrasado";

  return "pendente";
}

export default function PagamentosPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user;
      if (!u) {
        setUser(null);
        setPagamentos([]);
        setProjetos([]);
        setErro("Usuário não autenticado.");
        setLoading(false);
        return;
      }

      setUser(u);

      const [{ data: pagData }, { data: projData }] = await Promise.all([
        supabase
          .from("pagamentos")
          .select("*")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("projetos")
          .select(`
            id,
            titulo,
            cliente_id,
            clientes:cliente_id (
              id,
              nome,
              empresa,
              foto_url
            )
          `)
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),
      ]);

      setPagamentos((pagData || []) as Pagamento[]);

      const normalizados = (projData || []).map((p: any) => ({
        ...p,
        clientes: Array.isArray(p.clientes) ? p.clientes[0] || null : p.clientes,
      })) as Projeto[];

      setProjetos(normalizados);

      setErro(null);
      setLoading(false);
    }

    carregar();
  }, []);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const displayName =
    user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";

  function clienteInfo(projetoId: string | null) {
    if (!projetoId) return null;
    return projetos.find((p) => p.id === projetoId)?.clientes || null;
  }

  function projetoNome(id: string | null) {
    if (!id) return "Projeto não definido";
    return projetos.find((p) => p.id === id)?.titulo || "Projeto não encontrado";
  }

  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter((p) => {
      const tipo = classificarPagamento(p);
      if (filtroStatus === "pendentes") return tipo === "pendente" || tipo === "atrasado";
      if (filtroStatus === "pagos") return tipo === "pago";
      return true;
    });
  }, [pagamentos, filtroStatus]);

  function statusVisual(p: Pagamento) {
    const tipo = classificarPagamento(p);
    if (tipo === "pago")
      return { label: "Pago", bg: "bg-emerald-400", text: "text-primary-900" };
    if (tipo === "atrasado")
      return { label: "Atrasado", bg: "bg-rose-500", text: "text-primary-50" };
    return { label: "Pendente", bg: "bg-amber-400", text: "text-primary-900" };
  }

  async function enviarCobranca(p: Pagamento) {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    if (!u) return alert("Usuário não autenticado.");

    await supabase.from("atividades").insert([
      {
        user_id: u.id,
        projeto_id: p.projeto_id,
        tipo: "Pagamentos",
        descricao: "Cobrança enviada ao cliente.",
      },
    ]);

    alert("Cobrança registrada.");
  }

  async function excluirPagamento(id: string) {
    if (!confirm("Excluir este pagamento?")) return;
    await supabase.from("pagamentos").delete().eq("id", id);
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  }

  const total = pagamentos.length;

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 overflow-hidden">
        <header className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 border border-primary-700 text-gray-300 rounded-lg hover:bg-primary-800 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="text-[14px]">Voltar</span>
            </button>

            <div className="flex flex-col">
              <h1 className="text-[28px] md:text-[32px] font-semibold text-gray-100">
                Pagamentos
              </h1>
              <p className="text-[15px] md:text-[16px] text-gray-300">
                Overview geral dos pagamentos dos seus projetos.
              </p>
            </div>
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-primary-800 border border-primary-700/70 transition-colors"
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
                  className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/dashboard/perfil");
                  }}
                >
                  <Pencil size={20} className="text-primary-200" />
                  Editar perfil
                </button>

                <button
                  className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/dashboard/tema");
                  }}
                >
                  <SlidersHorizontal size={20} className="text-primary-200" />
                  Personalizar tema
                </button>

                <button className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300">
                  <Crown size={20} />
                  Assinatura
                </button>

                <button
                  className="flex items-center gap-3 text-red-400 hover:text-red-300 pt-2"
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
        </header>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-500" />
            <span>
              {total === 0
                ? "Nenhum pagamento cadastrado"
                : total === 1
                ? "1 pagamento cadastrado"
                : `${total} pagamentos cadastrados`}
            </span>
          </div>

          <div className="flex-1" />

          <div className="relative">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-[13px] text-gray-100 appearance-none"
            >
              <option value="">Todos os status</option>
              <option value="pendentes">Pendentes</option>
              <option value="pagos">Pagos</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
              ▼
            </span>
          </div>
        </div>

        <section className="flex-1 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-primary-700 text-[13px] text-gray-400 grid grid-cols-7 gap-4">
            <div>Cliente</div>
            <div>Projeto</div>
            <div>Status</div>
            <div>Valor</div>
            <div>Vencimento / Pagamento</div>
            <div>Criação</div>
            <div className="text-right">Ações</div>
          </div>

          <div className="flex-1 overflow-y-auto payments-scroll">
            {loading ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                Carregando pagamentos...
              </div>
            ) : erro ? (
              <div className="py-16 text-center text-red-400 text-sm">{erro}</div>
            ) : pagamentosFiltrados.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                Nenhum pagamento encontrado.
              </div>
            ) : (
              <div className="divide-y divide-primary-800">
                {pagamentosFiltrados.map((p) => {
                  const status = statusVisual(p);
                  const cliente = clienteInfo(p.projeto_id);
                  const foto = cliente?.foto_url || "/cliente_placeholder.svg";
                  const tipo = classificarPagamento(p);
                  const dataRef =
                    tipo === "pago" ? p.data_pagamento : p.data_vencimento;

                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-primary-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-primary-700 flex-shrink-0">
                          <Image
                            src={foto}
                            alt="Cliente"
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] text-gray-100">
                            {cliente?.nome || "Cliente"}
                          </span>
                          <span className="text-[12px] text-gray-400">
                            {cliente?.empresa || ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-100 text-[15px]">
                        {projetoNome(p.projeto_id)}
                      </div>

                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium ${status.bg} ${status.text}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center text-[14px] text-gray-100">
                        {p.valor
                          ? p.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </div>

                      <div className="flex items-center text-[13px] text-gray-100">
                        {tipo === "pago"
                          ? `Pago em ${formatarDataCurta(dataRef)}`
                          : dataRef
                          ? `Vence em ${formatarDataCurta(dataRef)}`
                          : "Vencimento não definido"}
                      </div>

                      <div className="flex items-center text-[13px] text-gray-400">
                        {tempoRelativo(p.created_at)}
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        {tipo !== "pago" && (
                          <button
                            onClick={() => enviarCobranca(p)}
                            className="px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 border border-primary-500 text-[12px] text-primary-100"
                          >
                            Cobrar
                          </button>
                        )}

                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuId((cur) => (cur === p.id ? null : p.id))
                            }
                            className="p-1.5 rounded-lg hover:bg-primary-700 text-gray-400"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>

                          {openMenuId === p.id && (
                            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl z-20">
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (p.projeto_id)
                                    router.push(`/dashboard/projetos/${p.projeto_id}`);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 rounded-t-xl"
                              >
                                Ver projeto
                              </button>

                              <button
                                onClick={() => excluirPagamento(p.id)}
                                className="w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-primary-700 rounded-b-xl"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <style jsx global>{`
          .payments-scroll::-webkit-scrollbar {
            width: 10px;
          }
          .payments-scroll::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.9);
          }
          .payments-scroll::-webkit-scrollbar-thumb {
            background: var(--primary-500);
            border-radius: 999px;
            border: 2px solid rgba(15, 23, 42, 0.9);
          }
          .payments-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--primary-400);
          }
          .payments-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-500) rgba(15, 23, 42, 0.9);
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
    </div>
  );
}
