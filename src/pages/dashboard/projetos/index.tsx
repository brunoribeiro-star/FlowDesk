"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ProjetoStatus = "Em andamento" | "Concluído" | "Arquivado";

type Projeto = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: any | null;
  cliente_id: string | null;
  orcamento: number | null;
  data_inicio: string | null;
  prazo_entrega: string | null;
  status: ProjetoStatus;
  progresso: number | null;
  link_arquivos: string | null;
  etapa_atual: string | null;
  notas_internas: string | null;
  created_at: string;
  updated_at: string;
  clientes?: {
    id: string;
    nome: string | null;
    empresa: string | null;
    foto_url: string | null;
  } | null;
};

type Pagamento = {
  id: string;
  projeto_id: string;
  valor: number;
  status: string;
  data_pagamento: string | null;
  created_at: string;
};

type ViewMode = "list" | "board";

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (() => void) | null;
};

function jsonToPlainText(json: any): string {
  try {
    if (!json) return "";
    if (typeof json === "string") {
      try {
        json = JSON.parse(json);
      } catch {
        return json;
      }
    }
    if (!json?.content) return "";
    let finalText = "";
    json.content.forEach((block: any) => {
      block?.content?.forEach((piece: any) => {
        if (piece.text) finalText += piece.text + " ";
      });
    });
    return finalText.trim();
  } catch {
    return "";
  }
}

export default function ProjetosPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [pagamentosByProjeto, setPagamentosByProjeto] = useState<
    Record<string, Pagamento[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuário");
  const [userAvatarUrl, setUserAvatarUrl] = useState("/perfil.svg");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | ProjetoStatus>(
    "Todos"
  );

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [trashActive, setTrashActive] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
    onConfirm: null,
  });

  // ▼▼ NOVO: estados e refs para o dropdown de perfil (igual dashboard) ▼▼
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const avatarSrc = userAvatarUrl || "/perfil.svg";
  const displayName = userName?.split("@")[0] || "Usuário";

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
  // ▲▲ FIM BLOCO NOVO DO DROPDOWN ▲▲

  function getPagamentos(projetoId: string): Pagamento[] {
    return pagamentosByProjeto[projetoId] || [];
  }

  function hasPagamentoPendente(projetoId: string): boolean {
    const list = getPagamentos(projetoId);
    if (!list.length) return false;
    return list.some((p) => p.status !== "pago");
  }

  function valorPendente(projetoId: string): number {
    const list = getPagamentos(projetoId);
    return list
      .filter((p) => p.status !== "pago")
      .reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
  }

  async function fetchProjetos() {
    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setError("Usuário não autenticado.");
        setProjetos([]);
        setLoading(false);
        return;
      }

      const meta = user.user_metadata || {};
      setUserName(meta.nome || user.email || "Usuário");
      setUserAvatarUrl(meta.avatar_url || "/perfil.svg");

      const { data: projData, error: projError } = await supabase
        .from("projetos")
        .select(
          `
          *,
          clientes:cliente_id (
            id,
            nome,
            empresa,
            foto_url
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projError) throw projError;

      const projetosLista = (projData || []) as Projeto[];
      setProjetos(projetosLista);

      if (projetosLista.length > 0) {
        const ids = projetosLista.map((p) => p.id);
        const { data: payData, error: payError } = await supabase
          .from("pagamentos")
          .select("*")
          .in("projeto_id", ids);

        if (payError) {
          console.error("Erro ao carregar pagamentos:", payError.message);
        }

        const map: Record<string, Pagamento[]> = {};
        (payData || []).forEach((p: any) => {
          const key = String(p.projeto_id);
          if (!map[key]) map[key] = [];
          map[key].push(p as Pagamento);
        });

        setPagamentosByProjeto(map);
      } else {
        setPagamentosByProjeto({});
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar projetos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedView = localStorage.getItem("flowdesk_view_mode");
    if (savedView === "list" || savedView === "board") {
      setViewMode(savedView as ViewMode);
    }
  }, []);

  useEffect(() => {
    fetchProjetos();
  }, []);

  function statusStyles(status: ProjetoStatus) {
    if (status === "Concluído") {
      return {
        tagBg: "bg-third-400",
        tagText: "text-primary-100",
        barFill: "bg-third-400",
      };
    }
    if (status === "Arquivado") {
      return {
        tagBg: "bg-gray-400",
        tagText: "text-primary-900",
        barFill: "bg-gray-400",
      };
    }
    return {
      tagBg: "bg-primary-500",
      tagText: "text-primary-100",
      barFill: "bg-primary-400",
    };
  }

  function progressValue(p: Projeto) {
    if (p.status === "Concluído") return 100;
    return Math.max(0, Math.min(100, Number(p.progresso ?? 0)));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return projetos.filter((p) => {
      const statusOk =
        statusFilter === "Todos" ? true : p.status === statusFilter;
      if (!statusOk) return false;

      if (!q) return true;

      const nomeCliente = p.clientes?.nome || "";
      const haystack = `${p.titulo} ${p.status} ${nomeCliente}`.toLowerCase();

      return haystack.includes(q);
    });
  }, [projetos, query, statusFilter]);

  function openConfirm(config: Partial<ConfirmState>) {
    setConfirm((prev) => ({
      open: true,
      title: config.title ?? prev.title,
      message: config.message ?? prev.message,
      confirmLabel: config.confirmLabel ?? "Confirmar",
      cancelLabel: config.cancelLabel ?? "Cancelar",
      onConfirm: config.onConfirm ?? prev.onConfirm,
    }));
  }

  function closeConfirm() {
    setConfirm((prev) => ({ ...prev, open: false, onConfirm: null }));
  }

  function handleAskDelete(projectId: string) {
    const projeto = projetos.find((p) => p.id === projectId);
    if (!projeto) return;

    openConfirm({
      title: "Excluir projeto",
      message:
        "Tem certeza de que deseja excluir este projeto? Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        closeConfirm();
        await deleteProject(projectId);
      },
    });
  }

  async function deleteProject(projectId: string) {
    try {
      setProjetos((prev) => prev.filter((p) => p.id !== projectId));
      setPagamentosByProjeto((prev) => {
        const clone = { ...prev };
        delete clone[projectId];
        return clone;
      });

      await supabase.from("pagamentos").delete().eq("projeto_id", projectId);

      const { error } = await supabase
        .from("projetos")
        .delete()
        .eq("id", projectId);

      if (error) {
        console.error("Erro ao excluir projeto:", error.message);
        fetchProjetos();
      }
    } catch (err) {
      console.error("Erro ao excluir projeto:", err);
      fetchProjetos();
    }
  }

  async function updateProjectStatus(
    projectId: string,
    nextStatus: ProjetoStatus
  ) {
    const projeto = projetos.find((p) => p.id === projectId);
    if (!projeto) return;

    const pagamentosPendentes = hasPagamentoPendente(projectId);

    if (nextStatus === "Concluído" && pagamentosPendentes) {
      const valor = valorPendente(projectId);

      openConfirm({
        title: "Pagamento pendente",
        message: `Este projeto ainda possui pagamento pendente no valor de R$ ${valor.toLocaleString(
          "pt-BR",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}. Antes de concluir o projeto, confirme o recebimento do valor restante.`,
        confirmLabel: "Marcar como pago e concluir",
        cancelLabel: "Cancelar",
        onConfirm: async () => {
          closeConfirm();
          await marcarPagamentosComoPagosEConcluir(projectId);
        },
      });

      return;
    }

    const prevState = projetos;
    setProjetos((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: nextStatus } : p))
    );

    const { error } = await supabase
      .from("projetos")
      .update({ status: nextStatus })
      .eq("id", projectId);

    if (error) {
      console.error("Erro ao atualizar status:", error.message);
      setProjetos(prevState);
    }
  }

  async function marcarPagamentosComoPagosEConcluir(projectId: string) {
    try {
      const pendentes = getPagamentos(projectId).filter(
        (p) => p.status !== "pago"
      );

      if (pendentes.length) {
        const { error: payError } = await supabase
          .from("pagamentos")
          .update({
            status: "pago",
            data_pagamento: new Date().toISOString().slice(0, 10),
          })
          .eq("projeto_id", projectId)
          .neq("status", "pago");

        if (payError) {
          console.error("Erro ao atualizar pagamentos:", payError.message);
        }
      }

      setPagamentosByProjeto((prev) => {
        const clone = { ...prev };
        const list = clone[projectId] || [];
        clone[projectId] = list.map((p) => ({ ...p, status: "pago" }));
        return clone;
      });

      const prevState = projetos;
      setProjetos((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: "Concluído" } : p
        )
      );

      const { error } = await supabase
        .from("projetos")
        .update({ status: "Concluído" })
        .eq("id", projectId);

      if (error) {
        console.error("Erro ao atualizar status:", error.message);
        setProjetos(prevState);
      }
    } catch (err) {
      console.error("Erro ao marcar pagamentos como pagos:", err);
    }
  }

  function handleDragStart(projectId: string) {
    setDraggingId(projectId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setTrashActive(false);
  }

  function handleColumnDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  async function handleColumnDrop(coluna: ProjetoStatus) {
    if (!draggingId) return;

    const proj = projetos.find((p) => p.id === draggingId);
    if (!proj || proj.status === coluna) {
      setDraggingId(null);
      return;
    }

    const current = draggingId;
    setDraggingId(null);
    await updateProjectStatus(current, coluna);
  }

  const columns: { status: ProjetoStatus; label: string; pillColor: string }[] =
    [
      { status: "Em andamento", label: "Ativo", pillColor: "bg-primary-500" },
      { status: "Concluído", label: "Concluído", pillColor: "bg-third-400" },
      { status: "Arquivado", label: "Arquivado", pillColor: "bg-gray-400" },
    ];

  const totalProjetos = projetos.length;

  function renderListView() {
    const temErroOuVazio = !loading && (error || !filtered.length);

    return (
      <div className="flex-1 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-primary-700 text-[13px] text-gray-400 flex items-center gap-4">
          <div className="w-[52px]" />
          <div className="flex-1 min-w-[200px]">Projeto</div>
          <div className="w-[180px] hidden md:block">Cliente</div>
          <div className="w-[140px] hidden md:block">Valor</div>
          <div className="w-[160px] hidden md:block">Etapa</div>
          <div className="w-[120px] hidden md:block">Entrega</div>
          <div className="w-[40px]" />
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Carregando projetos...
            </div>
          ) : temErroOuVazio ? (
            <div className="py-16 text-center text-sm">
              {error ? (
                <span className="text-red-400">{error}</span>
              ) : (
                <span className="text-gray-500">
                  Nenhum projeto encontrado com os filtros atuais.
                </span>
              )}
            </div>
          ) : (
            <div className="divide-y divide-primary-800">
              {filtered.map((p) => {
                const styles = statusStyles(p.status);
                const pct = progressValue(p);
                const clienteNome =
                  p.clientes?.nome || "Cliente não informado";
                const pendente = hasPagamentoPendente(p.id);
                const valorRestante = valorPendente(p.id);
                const previewDescricao = p.descricao
                  ? jsonToPlainText(p.descricao).slice(0, 140)
                  : "";
                const clienteFoto = p.clientes?.foto_url || "/perfil.svg";

                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-primary-800/70 cursor-pointer transition-colors group"
                  >
                    <div className="w-[52px] flex items-center justify-center">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium ${styles.tagBg} ${styles.tagText}`}
                      >
                        {p.status === "Em andamento" ? "Ativo" : p.status}
                      </span>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <div className="text-[16px] md:text-[17px] text-gray-100">
                        {p.titulo}
                      </div>
                      {previewDescricao && (
                        <div className="mt-1 text-[13px] text-gray-400 line-clamp-1">
                          {previewDescricao}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-[3px] md:hidden">
                        {[0, 1, 2, 3].map((idx) => {
                          const limit = (idx + 1) * 25;
                          const filled = pct >= limit;
                          return (
                            <span
                              key={idx}
                              className={`w-[6px] h-[16px] rounded-sm ${
                                filled ? styles.barFill : "bg-primary-800"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="w-[180px] hidden md:flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-primary-600 bg-primary-900">
                        <Image
                          src={clienteFoto}
                          alt={clienteNome}
                          width={36}
                          height={36}
                          className="object-cover"
                        />
                      </div>
                      <span className="text-[14px] text-primary-100 truncate max-w-[130px]">
                        {clienteNome}
                      </span>
                    </div>

                    <div className="w-[140px] hidden md:block">
                      <div className="text-[14px] text-gray-100">
                        {p.orcamento
                          ? p.orcamento.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </div>
                      {pendente && (
                        <div className="mt-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40 inline-flex">
                          Pend.:{" "}
                          {valorRestante.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                      )}
                    </div>

                    <div className="w-[160px] hidden md:block">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-primary-800 border border-primary-600 text-[12px] text-gray-100 max-w-[150px] truncate">
                        {p.etapa_atual || "Etapa não definida"}
                      </span>
                    </div>

                    <div className="w-[120px] hidden md:block">
                      <span className="text-[13px] text-gray-100">
                        {p.prazo_entrega
                          ? new Date(p.prazo_entrega).toLocaleDateString(
                              "pt-BR"
                            )
                          : "—"}
                      </span>
                    </div>

                    <div className="w-[40px] flex justify-end">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((current) =>
                              current === p.id ? null : p.id
                            );
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary-700 text-gray-400"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
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

                        {menuOpenId === p.id && (
                          <div
                            className="absolute right-0 mt-2 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/dashboard/projetos/${p.id}`)
                              }
                              className="w-full text-left px-4 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 rounded-t-xl"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                handleAskDelete(p.id);
                              }}
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
      </div>
    );
  }

  function renderBoardView() {
    if (loading) {
      return <div className="mt-8 text-gray-300">Carregando projetos...</div>;
    }

    if (error) {
      return <div className="mt-8 text-red-400">{error}</div>;
    }

    if (!filtered.length) {
      return (
        <div className="mt-8 text-gray-400">Nenhum projeto encontrado.</div>
      );
    }

    return (
      <div className="mt-6 flex gap-4 h-full min-h-0 overflow-x-auto pb-4 custom-scrollbar">
        {columns.map((col) => {
          const colProjects = filtered.filter((p) => p.status === col.status);

          return (
            <div
              key={col.status}
              className="flex-1 min-w-[280px] bg-primary-800 border border-primary-700 rounded-xl flex flex-col min-h-0"
            >
              <div className="px-5 py-4 flex items-center justify-between border-b border-primary-700">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      col.status === "Em andamento"
                        ? "bg-primary-500"
                        : col.status === "Concluído"
                        ? "bg-third-400"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="text-[15px] text-gray-100 font-medium">
                    {col.label}
                  </span>
                </div>
                <span className="text-[13px] text-gray-400">
                  {colProjects.length}
                </span>
              </div>

              <div
                onDragOver={handleColumnDragOver}
                onDrop={() => handleColumnDrop(col.status)}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar"
              >
                {colProjects.length === 0 ? (
                  <div className="text-[13px] text-gray-500 italic">
                    Nenhum projeto nesta coluna.
                  </div>
                ) : (
                  colProjects.map((p) => {
                    const styles = statusStyles(p.status);
                    const pct = progressValue(p);
                    const clienteNome =
                      p.clientes?.nome || "Cliente não informado";
                    const pendente = hasPagamentoPendente(p.id);
                    const valorRestante = valorPendente(p.id);
                    const clienteFoto = p.clientes?.foto_url || "/perfil.svg";

                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragStart(p.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-primary-900/80 border border-primary-700 rounded-xl px-4 py-4 cursor-grab active:cursor-grabbing shadow-[0_0_0_1px_rgba(0,0,0,0.4)] hover:border-primary-500 transition-colors ${
                          draggingId === p.id
                            ? "opacity-60 border-primary-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-[16px] text-primary-100 font-semibold mb-1 line-clamp-2">
                              {p.titulo}
                            </h3>
                            <div className="text-[12px] text-gray-400 mb-2">
                              {p.orcamento
                                ? p.orcamento.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : "Sem orçamento definido"}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId((prev) =>
                                  prev === p.id ? null : p.id
                                );
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-primary-800 text-gray-300"
                            >
                              ⋮
                            </button>

                            {menuOpenId === p.id && (
                              <div
                                className="absolute right-0 top-7 z-30 w-40 rounded-lg bg-primary-800 border border-primary-700 shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/dashboard/projetos/${p.id}`)
                                  }
                                  className="w-full text-left px-4 py-2 text-[14px] text-gray-100 hover:bg-primary-700"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    handleAskDelete(p.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[14px] text-red-300 hover:bg-red-500/10"
                                >
                                  Excluir
                                </button>
                              </div>
                            )}

                            <div className="flex items-end gap-[3px]">
                              {[0, 1, 2, 3].map((idx) => {
                                const limit = (idx + 1) * 25;
                                const filled = pct >= limit;
                                return (
                                  <span
                                    key={idx}
                                    className={`w-[6px] h-[16px] rounded-sm ${
                                      filled
                                        ? styles.barFill
                                        : "bg-primary-700"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-[12px] text-gray-300">
                          {p.prazo_entrega
                            ? `Entrega: ${new Date(
                                p.prazo_entrega
                              ).toLocaleDateString("pt-BR")}`
                            : "Entrega não definida"}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-primary-600 bg-primary-900">
                            <Image
                              src={clienteFoto}
                              alt={clienteNome}
                              width={28}
                              height={28}
                              className="object-cover"
                            />
                          </div>
                          <span className="text-[13px] text-primary-100">
                            {clienteNome}
                          </span>
                        </div>

                        {pendente && (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/50">
                              Pendência:{" "}
                              {valorRestante.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                openConfirm({
                                  title: "Confirmar pagamento",
                                  message:
                                    "Confirma que o valor restante deste projeto já foi recebido?",
                                  confirmLabel: "Sim, já recebi",
                                  cancelLabel: "Cancelar",
                                  onConfirm: async () => {
                                    closeConfirm();
                                    await marcarPagamentosComoPagosEConcluir(
                                      p.id
                                    );
                                  },
                                })
                              }
                              className="text-[11px] px-3 py-1 rounded-full bg-primary-700 hover:bg-primary-600 text-primary-100 border border-primary-500"
                            >
                              Marcar pago + concluir
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/dashboard/projetos/${p.id}`)
                          }
                          className="mt-3 w-full bg-primary-800 border border-primary-700 text-[13px] text-gray-200 rounded-lg py-2 hover:bg-primary-700 transition-colors"
                        >
                          Ver detalhes
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden relative">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden border border-primary-600 bg-primary-900">
              <Image
                src={userAvatarUrl}
                alt="Avatar"
                width={70}
                height={70}
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[30px] text-gray-200 font-medium">
                Olá, {userName.split("@")[0]}!
              </span>
              <span className="text-[20px] text-gray-300">
                Acompanhe e gerencie seus projetos
              </span>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-3 ml-8">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[15px] text-gray-300">
                {totalProjetos === 0
                  ? "Nenhum projeto cadastrado"
                  : totalProjetos === 1
                  ? "1 projeto cadastrado"
                  : `${totalProjetos} projetos cadastrados`}
              </span>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-primary-800 border border-primary-700 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("list");
                      localStorage.setItem("flowdesk_view_mode", "list");
                    }}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      viewMode === "list"
                        ? "bg-primary-500 text-primary-900"
                        : "text-gray-300"
                    }`}
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("board");
                      localStorage.setItem("flowdesk_view_mode", "board");
                    }}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      viewMode === "board"
                        ? "bg-primary-500 text-primary-900"
                        : "text-gray-300"
                    }`}
                  >
                    Quadros
                  </button>
                </div>

                <button
                  onClick={() => router.push("/dashboard/projetos/novo")}
                  className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-2.5 px-6 text-[16px] font-semibold transition-colors"
                >
                  + Projeto
                </button>

                {/* ▼▼ DROPDOWN IGUAL DA DASHBOARD ▼▼ */}
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
                        <SlidersHorizontal
                          size={20}
                          className="text-primary-200"
                        />
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
                {/* ▲▲ FIM DROPDOWN ▲▲ */}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 bg-primary-800 border border-primary-700 rounded-lg px-4 py-2.5">
                <Image src="/buscar.svg" alt="Buscar" width={18} height={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por projeto, cliente ou status..."
                  className="w-full bg-transparent outline-none text-[15px] text-gray-200 placeholder-gray-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2.5 text-[15px] text-gray-200"
              >
                <option value="Todos">Todos os status</option>
                <option value="Em andamento">Ativo</option>
                <option value="Concluído">Concluído</option>
                <option value="Arquivado">Arquivado</option>
              </select>
            </div>
          </div>
        </div>

        <section className="flex-1 h-full min-h-0 overflow-y-auto pr-4 custom-scrollbar">
          {viewMode === "list" ? renderListView() : renderBoardView()}
        </section>

        {viewMode === "board" && totalProjetos > 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (draggingId) setTrashActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setTrashActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setTrashActive(false);
              if (!draggingId) return;
              const proj = projetos.find((p) => p.id === draggingId);
              setDraggingId(null);
              if (!proj) return;
              handleAskDelete(proj.id);
            }}
            className={`fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-2xl border-2 cursor-pointer transition-all ${
              trashActive
                ? "bg-primary-500/90 border-primary-200 shadow-[0_0_30px_rgba(56,189,248,0.9)] scale-105"
                : "bg-primary-800/80 border-primary-700 shadow-[0_0_20px_rgba(15,23,42,0.7)]"
            }`}
          >
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="inline-flex w-9 h-9 rounded-full bg-primary-900/70 items-center justify-center">
                🗑️
              </span>
              <div className="flex flex-col">
                <span className="text-[13px] text-gray-200 font-medium">
                  Arraste aqui para excluir
                </span>
                <span className="text-[11px] text-primary-100/80">
                  Ação permanente
                </span>
              </div>
            </div>
          </div>
        )}

        {confirm.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl bg-primary-800 border border-primary-600 shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-400 flex items-center justify-center text-primary-100 text-xl">
                    !
                  </div>
                  <h2 className="text-[20px] text-primary-100 font-semibold">
                    {confirm.title}
                  </h2>
                </div>
                <p className="text-[15px] text-gray-200 leading-relaxed">
                  {confirm.message}
                </p>
                <div className="mt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[15px] hover:bg-primary-700 transition-colors"
                  >
                    {confirm.cancelLabel || "Cancelar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cb = confirm.onConfirm;
                      if (cb) cb();
                    }}
                    className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-4 py-2 text-[15px] font-semibold transition-colors"
                  >
                    {confirm.confirmLabel || "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: var(--primary-800);
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
