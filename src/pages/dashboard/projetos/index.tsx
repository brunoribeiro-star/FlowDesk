"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import HeaderProfile from "@/components/HeaderProfile";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList, SkeletonBoardCards } from "@/components/Skeleton";
import { Search } from "lucide-react";
import { jsonToPlainText, calcularUrgencia } from "@/lib/utils";
import UrgenciaIndicator from "@/components/UrgenciaIndicator";

type ProjetoStatus = "arquivado" | "para fazer" | "fazendo" | "pausado" | "concluído" | "pgto pendente" | "finalizado";

type Projeto = {
  id: string;
  user_id: string;
  titulo: string;
  descricao?: any | null;
  cover_url: string | null;
  cliente_id: string | null;
  orcamento: number | null;
  data_inicio?: string | null;
  prazo_entrega: string | null;
  status: string;
  progresso: number | null;
  link_arquivos?: string | null;
  etapa_atual?: string | null;
  notas_internas?: string | null;
  created_at: string;
  updated_at: string;
  forma_pagamento?: string;
  isCollaborator?: boolean;
  collaboratorValue?: number | null;
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

type ViewMode = "list" | "board" | "calendar";

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (() => void) | null;
};

function isArchivedProject(p: Projeto): boolean {
  if (p.status === "Arquivado" || p.status === "Cancelado") return true;
  
  const status = p.status ? p.status.toLowerCase() : "";
  const isFinalizado = status === "concluído" || status === "concluido";
  
  if (!isFinalizado) return false;

  const projDate = p.updated_at ? new Date(p.updated_at) : new Date(p.created_at);
  if (isNaN(projDate.getTime())) return false;

  const now = new Date();
  
  return projDate.getMonth() !== now.getMonth() || projDate.getFullYear() !== now.getFullYear();
}

function normalizeStatus(p: Projeto, pagamentosPendente: boolean): "para fazer" | "fazendo" | "pgto pendente" | "finalizado" | "arquivado" {
  if (isArchivedProject(p)) return "arquivado";

  const s = String(p.status || "")
    .trim()
    .toLowerCase();

  if (s === "concluído" || s === "concluido") {
    return pagamentosPendente ? "pgto pendente" : "finalizado";
  }
  if (s === "fazendo" || s === "em andamento" || s === "andamento" || s === "doing") return "fazendo";
  
  return "para fazer";
}

function statusLabel(s: string) {
  if (s === "para fazer") return "Para fazer";
  if (s === "fazendo") return "Fazendo";
  if (s === "pgto pendente") return "Pgto. Pendente";
  if (s === "finalizado") return "Finalizado";
  return "Arquivado";
}

function statusPillClasses(s: string) {
  if (s === "arquivado") return "bg-gray-500/10 border border-gray-400 text-gray-300";
  if (s === "para fazer") return "bg-sky-500/10 border border-sky-400/30 text-sky-300";
  if (s === "fazendo") return "bg-amber-500/10 border border-amber-400/30 text-amber-300";
  if (s === "pgto pendente") return "bg-orange-500/10 border border-orange-400/30 text-orange-300";
  return "bg-emerald-500/10 border border-emerald-400/30 text-emerald-300";
}


const KANBAN_COLUMNS = [
  { status: "para fazer", label: "Para fazer" },
  { status: "fazendo", label: "Fazendo" },
  { status: "pgto pendente", label: "Pgto. Pendente" },
  { status: "finalizado", label: "Finalizado" },
] as const;

const ARCHIVED_COLUMNS = [
  { status: "arquivado", label: "Arquivado" },
] as const;

export default function ProjetosPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [pagamentosByProjeto, setPagamentosByProjeto] = useState<Record<string, Pagamento[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuário");
  const [userAvatarUrl, setUserAvatarUrl] = useState("/perfil.svg");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | string>("Todos");
  const [showArchived, setShowArchived] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [trashActive, setTrashActive] = useState(false);
  const [ownedMemberSplits, setOwnedMemberSplits] = useState<any[]>([]);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
    onConfirm: null,
  });

  const changeView = (newView: ViewMode) => {
    setViewMode(newView);
    localStorage.setItem("projetosViewMode", newView);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));



  function getPagamentos(projetoId: string): Pagamento[] {
    return pagamentosByProjeto[projetoId] || [];
  }

  function hasPagamentoPendente(p: Projeto): boolean {
    const list = getPagamentos(p.id);
    const isConcluido = p.status === "Concluído" || p.status === "concluído";

    if (!isConcluido) {
      if (list.length === 0) return false;
      return list.some((pag) => (pag.status || "").toLowerCase() !== "pago");
    }

    if (list.length > 0) {
      return list.some((pag) => (pag.status || "").toLowerCase() !== "pago");
    }

    return false;
  }

  function valorPendente(p: Projeto): number {
    const list = getPagamentos(p.id);
    const totalTable = list
      .filter((pag) => (pag.status || "").toLowerCase() !== "pago")
      .reduce((acc, cur) => acc + Number(cur.valor || 0), 0);

    if (totalTable > 0) return totalTable;

    const orcamento = Number(p.orcamento || 0);
    if (orcamento <= 0) return 0;

    const formaPagamento = (p as any).forma_pagamento;
    const isPix2x = formaPagamento === "pix_2x" || formaPagamento === "50/50";
    return isPix2x ? orcamento / 2 : orcamento;
  }

  async function fetchProjetos(silent = false) {
    try {
      if (!silent) setLoading(true);

      const user = authUser;

      if (!user) {
        setError("Usuário não autenticado.");
        setProjetos([]);
        setPagamentosByProjeto({});
        if (!silent) setLoading(false);
        return;
      }

      const meta = user.user_metadata || {};
      setUserName(meta.nome || user.email || "Usuário");
      setUserAvatarUrl(meta.avatar_url || "/perfil.svg");

      const [{ data: projData, error: projError }, { data: payAllData }, { data: memberRows }, { data: splitRows }] = await Promise.all([
        supabase
          .from("projetos")
          .select(
            `id, user_id, titulo, cover_url, cliente_id, orcamento, prazo_entrega, status, progresso, created_at, updated_at, forma_pagamento,
            clientes:cliente_id (
              id,
              nome,
              empresa,
              foto_url
            )`
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("pagamentos").select("id, valor, status, projeto_id").eq("user_id", user.id),
        supabase
          .from("project_members")
          .select(`project_id, projetos:project_id (id, user_id, titulo, cover_url, cliente_id, orcamento, prazo_entrega, status, progresso, created_at, updated_at, forma_pagamento, clientes:cliente_id(id, nome, empresa, foto_url))`)
          .eq("user_id", user.id),
        supabase
          .from("project_member_splits")
          .select("project_id, split_type, split_value, payment_status")
          .eq("member_user_id", user.id),
      ]);

      if (projError) throw projError;

      const ownedIds = new Set((projData || []).map((p: any) => p.id));
      const projetosLista = (projData || []) as unknown as Projeto[];

      const splitMap: Record<string, { split_type: string; split_value: number }> = {};
      (splitRows || []).forEach((s: any) => { splitMap[s.project_id] = s; });

      (memberRows || []).forEach((row: any) => {
        const proj = row.projetos;
        if (!proj || ownedIds.has(proj.id)) return;
        const split = splitMap[proj.id];
        let collaboratorValue: number | null = null;
        if (split && proj.orcamento) {
          collaboratorValue = split.split_type === "percentage"
            ? proj.orcamento * (split.split_value / 100)
            : split.split_value;
        }
        projetosLista.push({ ...proj, isCollaborator: true, collaboratorValue });
      });

      setProjetos(projetosLista);

      const map: Record<string, Pagamento[]> = {};
      (payAllData || []).forEach((p: any) => {
        const key = String(p.projeto_id);
        if (!map[key]) map[key] = [];
        map[key].push(p as Pagamento);
      });
      setPagamentosByProjeto(map);

      setError(null);

      const ownedProjectIds = Array.from(ownedIds);
      if (ownedProjectIds.length > 0) {
        supabase
          .from("project_member_splits")
          .select("project_id, member_user_id, split_type, split_value, payment_status")
          .in("project_id", ownedProjectIds)
          .neq("member_user_id", user.id)
          .then(({ data }) => setOwnedMemberSplits(data || []));
      } else {
        setOwnedMemberSplits([]);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar projetos.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    const savedView = typeof window !== "undefined" ? localStorage.getItem("projetosViewMode") : null;
    if (savedView === "list" || savedView === "board" || savedView === "calendar") setViewMode(savedView as ViewMode);
  }, []);

  useEffect(() => {
    fetchProjetos();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel("projetos-page-realtime")
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "projetos" }, (payload: any) => {
        const updated = payload.new;
        if (!updated?.id) { fetchProjetos(true); return; }
        setProjetos((prev) => {
          const idx = prev.findIndex((p) => p.id === updated.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next;
        });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "pagamentos", filter: `user_id=eq.${authUser.id}` }, (payload: any) => {
        const record = payload.new || payload.old;
        const projetoId = record?.projeto_id ? String(record.projeto_id) : null;
        if (!projetoId) { fetchProjetos(true); return; }
        supabase
          .from("pagamentos")
          .select("id, valor, status, projeto_id")
          .eq("projeto_id", projetoId)
          .eq("user_id", authUser.id)
          .then(({ data }) => {
            if (data) setPagamentosByProjeto((prev) => ({ ...prev, [projetoId]: data as Pagamento[] }));
          });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "collaborator_payment_splits", filter: `member_user_id=eq.${authUser.id}` }, () => {
        fetchProjetos(true);
      })
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "project_members", filter: `user_id=eq.${authUser.id}` }, () => {
        fetchProjetos(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  const closeMenusOnOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest?.("[data-project-menu]")) setMenuOpenId(null);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", closeMenusOnOutside);
    return () => document.removeEventListener("mousedown", closeMenusOnOutside);
  }, [closeMenusOnOutside]);

  const statusByProject = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projetos) {
      map[p.id] = normalizeStatus(p, hasPagamentoPendente(p));
    }
    return map;
  }, [projetos, pagamentosByProjeto]);

  const urgencyByProject = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projetos) {
      map[p.id] = calcularUrgencia(p.prazo_entrega);
    }
    return map;
  }, [projetos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projetos.filter((p) => {
      const ns = statusByProject[p.id];

      if (showArchived && ns !== "arquivado") return false;
      if (!showArchived && ns === "arquivado") return false;

      const statusOk = statusFilter === "Todos" ? true : ns === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      const nomeCliente = p.clientes?.nome || "";
      const haystack = `${p.titulo} ${ns} ${nomeCliente}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projetos, query, statusFilter, showArchived, statusByProject]);

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
      message: "Tem certeza de que deseja excluir este projeto? Essa ação não pode ser desfeita.",
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

      const { error } = await supabase.from("projetos").delete().eq("id", projectId);
      if (error) fetchProjetos();
    } catch {
      fetchProjetos();
    }
  }

  async function updateProjectStatus(projectId: string, nextStatus: ProjetoStatus) {
    const projeto = projetos.find((p) => p.id === projectId);
    if (!projeto) return;

    const pagamentosPendentes = hasPagamentoPendente(projeto);

    if (nextStatus === "concluído" && pagamentosPendentes) {
      const valor = valorPendente(projeto);
      openConfirm({
        title: "Pagamento pendente",
        message: `Este projeto ainda possui pagamento pendente no valor de R$ ${valor.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}. Antes de concluir o projeto, confirme o recebimento do valor restante.`,
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
    setProjetos((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: nextStatus } : p)));

    const { error } = await supabase.from("projetos").update({ status: nextStatus }).eq("id", projectId);
    if (error) setProjetos(prevState);
  }

  async function marcarPagamentosComoPagosEConcluir(projectId: string) {
    try {
      const today = new Date().toISOString().slice(0, 10);

      await supabase
        .from("pagamentos")
        .update({ status: "pago", data_pagamento: today })
        .eq("projeto_id", projectId)
        .neq("status", "pago");

      setPagamentosByProjeto((prev) => {
        const clone = { ...prev };
        const list = clone[projectId] || [];
        clone[projectId] = list.map((p) => ({ ...p, status: "pago" }));
        return clone;
      });

      const now = new Date().toISOString();
      const prevState = projetos;
      setProjetos((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: "concluído", updated_at: now } : p)));

      const { error } = await supabase.from("projetos").update({ status: "concluído", updated_at: now }).eq("id", projectId);
      if (error) setProjetos(prevState);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch("/api/payments/sync-splits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ project_id: projectId }),
        }).catch(() => {});
      }
    } catch {}
  }

  const handleDragStart = useCallback((projectId: string) => {
    setDraggingId(projectId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setTrashActive(false);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  async function verificarBloqueiosConclusao(projectId: string): Promise<string[]> {
    const bloqueios: string[] = [];

    const [
      { data: taskData },
      { data: briefingData },
      { data: entregavelData },
    ] = await Promise.all([
      supabase.from("tasks").select("id, concluida, status").eq("projeto_id", projectId),
      supabase.from("briefings_envios").select("id, status, respondido_em").eq("projeto_id", projectId),
      supabase.from("entregaveis").select("id").eq("project_id", projectId).eq("status", "aguardando_aprovacao"),
    ]);

    const tarefasIncompletas = (taskData || []).filter(
      (t: any) => !t.concluida && (t.status || "").toLowerCase() !== "concluida"
    );
    if (tarefasIncompletas.length > 0) {
      bloqueios.push(`${tarefasIncompletas.length} tarefa(s) não concluída(s)`);
    }

    const briefingsSemResposta = (briefingData || []).filter(
      (b: any) => b.status !== "respondido" && !b.respondido_em
    );
    if (briefingsSemResposta.length > 0) {
      bloqueios.push(`${briefingsSemResposta.length} briefing(s) sem resposta`);
    }

    if (entregavelData && entregavelData.length > 0) {
      bloqueios.push(`${entregavelData.length} entregável(is) aguardando aprovação do cliente`);
    }

    return bloqueios;
  }

  async function handleFinalizeProject(projectId: string) {
    const proj = projetos.find((p) => p.id === projectId);
    if (!proj) return;

    const clientePendente = hasPagamentoPendente(proj);

    if (clientePendente) {
      const valor = valorPendente(proj);
      openConfirm({
        title: "Confirmar recebimento",
        message: `O pagamento do cliente ainda está pendente (R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Confirma que já recebeu o valor?`,
        confirmLabel: "Sim, já recebi",
        cancelLabel: "Cancelar",
        onConfirm: async () => {
          closeConfirm();
          await checkCollabAndFinalize(projectId);
        },
      });
      return;
    }

    await checkCollabAndFinalize(projectId);
  }

  async function checkCollabAndFinalize(projectId: string) {
    const unpaidCollabs = ownedMemberSplits.filter(
      (s) => s.project_id === projectId && s.payment_status !== "paid"
    );

    if (unpaidCollabs.length > 0) {
      openConfirm({
        title: "Colaboradores sem pagamento",
        message: `Você ainda tem ${unpaidCollabs.length} colaborador${unpaidCollabs.length > 1 ? "es" : ""} sem pagamento registrado. Deseja pagar e finalizar o projeto?`,
        confirmLabel: "Pagar e finalizar",
        cancelLabel: "Cancelar",
        onConfirm: async () => {
          closeConfirm();
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await Promise.all(
              unpaidCollabs.map((collab) =>
                fetch("/api/collaborators/mark-paid", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    project_id: collab.project_id,
                    member_user_id: collab.member_user_id,
                  }),
                })
              )
            );
            setOwnedMemberSplits((prev) =>
              prev.map((s) =>
                s.project_id === projectId ? { ...s, payment_status: "paid" } : s
              )
            );
          }
          await marcarPagamentosComoPagosEConcluir(projectId);
        },
      });
      return;
    }

    await marcarPagamentosComoPagosEConcluir(projectId);
  }

  async function handleColumnDrop(coluna: ProjetoStatus) {
    if (!draggingId) return;

    const proj = projetos.find((p) => p.id === draggingId);
    if (!proj) {
      setDraggingId(null);
      return;
    }
    const current = draggingId;
    setDraggingId(null);

    const currentNs = normalizeStatus(proj, hasPagamentoPendente(proj));

    if (currentNs === coluna) return;

    if (coluna === "finalizado") {
      const bloqueios = await verificarBloqueiosConclusao(current);
      if (bloqueios.length > 0) {
        openConfirm({
          title: "Não é possível finalizar",
          message: `Resolva as pendências antes de finalizar: ${bloqueios.join("; ")}.`,
          confirmLabel: "Entendido",
          cancelLabel: "",
          onConfirm: () => { closeConfirm(); },
        });
        return;
      }
      await handleFinalizeProject(current);
      return;
    }

    if (coluna === "pgto pendente") {
      const bloqueiosConclusao = await verificarBloqueiosConclusao(current);
      if (bloqueiosConclusao.length > 0) {
        openConfirm({
          title: "Não é possível concluir",
          message: `Resolva as pendências antes de concluir: ${bloqueiosConclusao.join("; ")}.`,
          confirmLabel: "Entendido",
          cancelLabel: "",
          onConfirm: () => { closeConfirm(); },
        });
        return;
      }

      const pagList = getPagamentos(proj.id);
      const allAlreadyPaid = pagList.length > 0 && pagList.every((pg) => (pg.status || "").toLowerCase() === "pago");
      if (currentNs === "finalizado" || allAlreadyPaid) {
        openConfirm({
          title: "Pagamento já recebido",
          message: "Este projeto já tem todos os pagamentos marcados como recebidos. Ele não pode ser movido para 'Pgto. Pendente'.",
          confirmLabel: "Entendido",
          cancelLabel: "",
          onConfirm: () => { closeConfirm(); },
        });
        return;
      }

      if (pagList.length === 0 && Number(proj.orcamento || 0) > 0 && authUser) {
        const newPag = {
          projeto_id: proj.id,
          user_id: authUser.id,
          valor: Number(proj.orcamento),
          status: "pendente",
          forma_pagamento: proj.forma_pagamento || "outros",
          parcela: 1,
          total_parcelas: 1,
        };
        const { data: insertedPag, error: pagErr } = await supabase
          .from("pagamentos")
          .insert([newPag])
          .select("id, valor, status, projeto_id")
          .single();
        if (!pagErr && insertedPag) {
          setPagamentosByProjeto((prev) => ({
            ...prev,
            [proj.id]: [...(prev[proj.id] || []), insertedPag as Pagamento],
          }));
        }
      }

      const nowTs = new Date().toISOString();
      const prevState = [...projetos];
      setProjetos((prev) => prev.map((p) => (p.id === current ? { ...p, status: "concluído", updated_at: nowTs } : p)));
      const { error } = await supabase.from("projetos").update({ status: "concluído", updated_at: nowTs }).eq("id", current);
      if (error) setProjetos(prevState);
      return;
    }

    await updateProjectStatus(current, coluna);
  }

  const columns = showArchived ? ARCHIVED_COLUMNS : KANBAN_COLUMNS;

  const totalProjetos = projetos.length;

  function renderCalendarView() {
      if (loading) return <div className="mt-8 text-gray-300">Carregando projetos...</div>;

      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  
      return (
        <div className="flex-1 overflow-hidden flex flex-col bg-primary-900/40 border border-primary-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-primary-800 rounded-full text-gray-400 hover:text-gray-100 transition-colors"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-100 capitalize">
              {currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-primary-800 rounded-full text-gray-400 hover:text-gray-100 transition-colors"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
  
          <div className="grid grid-cols-7 gap-4 px-1">
            {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>
  
          <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-4 overflow-y-auto custom-scrollbar px-1 pb-2 mt-2">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
  
              const dateStr = date.toISOString().split("T")[0];
              const daysProjects = filtered.filter((p) => {
                  if (!p.prazo_entrega) return false;
                  return p.prazo_entrega.startsWith(dateStr);
              });
              const isToday = new Date().toDateString() === date.toDateString();
  
              return (
                <div
                  key={dateStr}
                  className={`flex flex-col gap-2 p-3 rounded-2xl transition-all border min-h-[140px] ${
                    isToday
                      ? "bg-primary-800/10 border-primary-500"
                      : "bg-primary-800/20 border-transparent hover:bg-primary-800/40"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-lg font-bold ${isToday ? "text-primary-500" : "text-gray-100"}`}>
                      {date.getDate()}
                    </span>
                    {daysProjects.length > 0 && (
                      <span className="text-[10px] text-gray-500 font-medium">{daysProjects.length}</span>
                    )}
                  </div>
  
                  <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1">
                    {daysProjects.map((p) => {
                      const urgencia = urgencyByProject[p.id] ?? "Sem prioridade";
                      const ns = statusByProject[p.id];
                      const isCompleted = ns === 'finalizado' || ns === 'arquivado';

                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
                          className="group flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg bg-primary-800 hover:bg-primary-700 transition-all shadow-sm min-w-0"
                          title={p.titulo}
                        >
                          <span className={`text-[11px] font-medium truncate flex-1 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                            {p.titulo}
                          </span>
                          <div className="shrink-0 scale-75 origin-right">
                              <UrgenciaIndicator nivel={urgencia} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
  }

  function renderViewToggle() {
      return (
        <div className="flex bg-primary-800 rounded-lg p-1 border border-primary-700">
          <button
            onClick={() => changeView("list")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "list" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
            }`}
            title="Visualização em Lista"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </button>
    
          <button
            onClick={() => changeView("board")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "board" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
            }`}
            title="Visualização em Quadros"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
          </button>
    
          <button
            onClick={() => changeView("calendar")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "calendar" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
            }`}
            title="Visualização em Calendário"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </button>
        </div>
      );
  }

  function renderListView() {
    const temErroOuVazio = !loading && (error || !filtered.length);

    return (
      <div className="flex-1 bg-primary-900/40 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-primary-700 text-[13px] text-gray-400 flex items-center gap-4">
          <div className="flex-1 min-w-[280px]">Projeto</div>
          <div className="w-[220px] hidden lg:block">Contato</div>
          <div className="w-[140px] hidden md:block">Valor</div>
          <div className="w-[140px] hidden md:block">Status</div>
          <div className="w-[120px] hidden md:block">Urgência</div>
          <div className="w-[130px] hidden md:block">Entrega</div>
          <div className="w-[44px]" />
        </div>

        <div className="flex-1 custom-scrollbar overflow-y-auto">
          {loading ? (
            <SkeletonList rows={7} cols={6} />
          ) : temErroOuVazio ? (
            <div className="py-16 text-center text-sm">
              {error ? <span className="text-red-400">{error}</span> : <span className="text-gray-500">Nenhum projeto encontrado com os filtros atuais.</span>}
            </div>
          ) : (
            <div className="px-5 py-5 flex flex-col gap-3">
              {filtered.map((p) => {
                const ns = statusByProject[p.id];
                const clienteNome = p.clientes?.nome || "Cliente não informado";
                const clienteFoto = p.clientes?.foto_url || "/perfil.svg";
                const pendente = ns === "pgto pendente";
                const valorRestante = valorPendente(p);
                const previewDescricao = p.descricao ? jsonToPlainText(p.descricao).slice(0, 110) : "";
                const entregaTxt = p.prazo_entrega ? new Date(p.prazo_entrega).toLocaleDateString("pt-BR") : "—";
                const urg = urgencyByProject[p.id] ?? "Sem prioridade";

                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
                    className="group w-full bg-primary-900/45 hover:bg-primary-800/60 border border-primary-700 rounded-full px-5 py-3 flex items-center gap-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                      <div className="w-[72px] h-[46px] rounded-2xl overflow-hidden border border-primary-700 bg-primary-900 shrink-0">
                        <Image
                          src={p.cover_url || "/project-cover-placeholder.jpg"}
                          alt={`Capa do projeto ${p.titulo}`}
                          width={220}
                          height={140}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] text-gray-100 truncate">{p.titulo}</span>
                          <span className={`hidden md:inline-flex items-center px-3 py-1 rounded-full text-[12px] ${statusPillClasses(ns)}`}>
                            {statusLabel(ns)}
                          </span>
                          {p.isCollaborator && (
                            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-500/10 text-sky-300 border border-sky-400/30">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              Colaborador
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-[13px] text-gray-400 line-clamp-1">{previewDescricao || clienteNome}</div>

                        <div className="mt-2 flex items-center gap-2 md:hidden">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] ${statusPillClasses(ns)}`}>
                            {statusLabel(ns)}
                          </span>
                          <div className="flex items-center gap-2 text-[12px] text-gray-300">
                            <UrgenciaIndicator nivel={urg} />
                            <span>{entregaTxt}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-[220px] hidden lg:flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-primary-700 bg-primary-900">
                        <Image src={clienteFoto} alt={clienteNome} width={36} height={36} className="object-cover" />
                      </div>
                      <span className="text-[14px] text-primary-100 truncate max-w-[160px]">{clienteNome}</span>
                    </div>

                    <div className="w-[140px] hidden md:block">
                      <div className="text-[14px] text-gray-100">
                        {p.isCollaborator
                          ? (p.collaboratorValue != null ? p.collaboratorValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—")
                          : (p.orcamento ? p.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—")
                        }
                      </div>
                      {pendente && !p.isCollaborator && (
                        <div className="mt-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/30 inline-flex">
                          Pend.: {valorRestante.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                      )}
                      {p.isCollaborator && (
                        <div className="mt-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/30 inline-flex">
                          Colaborador
                        </div>
                      )}
                    </div>

                    <div className="w-[140px] hidden md:flex">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] w-full ${statusPillClasses(ns)}`}>
                        {statusLabel(ns)}
                      </span>
                    </div>

                    <div className="w-[120px] hidden md:flex items-center justify-center">
                      <UrgenciaIndicator nivel={urg} />
                    </div>

                    <div className="w-[130px] hidden md:block">
                      <span className="text-[13px] text-gray-100">{entregaTxt}</span>
                    </div>

                    <div className="w-[44px] flex justify-end" data-project-menu>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((current) => (current === p.id ? null : p.id));
                          }}
                          className="p-2 rounded-full hover:bg-primary-700/60 text-gray-400"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>

                        {menuOpenId === p.id && (
                          <div className="absolute right-0 mt-2 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl z-20" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
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
    if (loading) return (
      <div className="mt-6 flex gap-4">
        {Array.from({length: 4}).map((_,i) => (
          <div key={i} className="flex-1 min-w-0"><SkeletonBoardCards count={2} /></div>
        ))}
      </div>
    );
    if (error) return <div className="mt-8 text-red-400">{error}</div>;
    if (!filtered.length) return <div className="mt-8 text-gray-400">Nenhum projeto encontrado.</div>;

    return (
      <div className="mt-6 overflow-y-auto pb-4 custom-scrollbar h-full">
        <div className="flex divide-x divide-primary-700 min-h-full">
          {columns.map((col) => {
            const colProjects = filtered.filter((p) => statusByProject[p.id] === col.status);

            return (
              <div key={col.status} className="flex-1 min-w-0 px-4 flex flex-col">
                <div className="px-2 py-4 flex items-center justify-between sticky top-0 bg-primary-900 z-10">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] ${statusPillClasses(col.status)}`}>
                      {col.label}
                    </span>
                    <span className="text-[13px] text-gray-400">{colProjects.length}</span>
                  </div>
                </div>

                <div
                  onDragOver={handleColumnDragOver}
                  onDrop={() => handleColumnDrop(col.status as ProjetoStatus)}
                  className="flex flex-col gap-4 pb-4 px-2 flex-1"
                >
                  {colProjects.length === 0 ? (
                    <div className="text-[13px] text-gray-500 italic px-1">Nenhum projeto.</div>
                  ) : (
                    colProjects.map((p) => {
                      const ns = statusByProject[p.id];
                      const clienteNome = p.clientes?.nome || "Cliente não informado";
                      const clienteFoto = p.clientes?.foto_url || "/perfil.svg";
                      const pendente = ns === "pgto pendente";
                      const valorRestante = valorPendente(p);
                      const entregaTxt = p.prazo_entrega ? new Date(p.prazo_entrega).toLocaleDateString("pt-BR") : "—";
                      const urg = urgencyByProject[p.id] ?? "Sem prioridade";

                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={() => handleDragStart(p.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-primary-900/55 border border-primary-700 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing hover:border-primary-500 transition-colors ${
                            draggingId === p.id ? "opacity-60 border-primary-500" : ""
                          }`}
                        >
                          <div className="relative w-full h-[120px] bg-primary-900 border-b border-primary-700">
                            <Image
                              src={p.cover_url || "/project-cover-placeholder.jpg"}
                              alt={`Capa do projeto ${p.titulo}`}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-primary-900/10 to-transparent" />
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-[15px] text-gray-100 font-medium line-clamp-2">{p.titulo}</div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <div className="text-[13px] text-gray-200">
                                    {p.orcamento ? p.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px] text-gray-300">
                                    <UrgenciaIndicator nivel={urg} />
                                    <span>{entregaTxt}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="relative flex flex-col items-end gap-2" data-project-menu>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId((prev) => (prev === p.id ? null : p.id));
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-800 text-gray-300"
                                >
                                  ⋮
                                </button>

                                {menuOpenId === p.id && (
                                  <div className="absolute right-0 top-8 z-30 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
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
                                      className="w-full text-left px-4 py-2.5 text-[13px] text-red-300 hover:bg-red-500/10 rounded-b-xl"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full overflow-hidden border border-primary-600 bg-primary-900">
                                  <Image src={clienteFoto} alt={clienteNome} width={28} height={28} className="object-cover" />
                                </div>
                                <span className="text-[13px] text-primary-100 truncate max-w-[190px]">{clienteNome}</span>
                              </div>
                            </div>

                            {pendente && ns === "pgto pendente" && (
                              <div className="mt-4 flex flex-col gap-2">
                                <span className="text-[12px] px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/30 text-center font-medium">
                                  Pendência: {valorRestante.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => checkCollabAndFinalize(p.id)}
                                  className="text-[14px] w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                  Pagamento recebido
                                </button>
                              </div>
                            )}

                            {ns === "arquivado" && (
                                <button
                                  type="button"
                                  onClick={() => handleAskDelete(p.id)}
                                  className="mt-3 w-full bg-red-500/10 border border-red-500/30 text-[13px] text-red-400 rounded-xl py-2 hover:bg-red-500/20 transition-colors"
                                >
                                  Excluir permanentemente
                                </button>
                            )}

                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
                              className="mt-3 w-full bg-primary-800 border border-primary-700 text-[13px] text-gray-200 rounded-xl py-2 hover:bg-primary-700 transition-colors"
                            >
                              Ver detalhes
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-4 pr-6 py-4 w-full overflow-hidden relative">
        <div className="flex items-center justify-between gap-4 w-full">
          <span className="text-[15px] text-gray-300">
            {totalProjetos === 0 ? "Nenhum projeto" : totalProjetos === 1 ? "1 projeto" : `${totalProjetos} projetos`}
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {renderViewToggle()}

            <div className="flex items-center gap-3 bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 w-[240px]">
              <Search size={18} className="text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-transparent outline-none text-[14px] text-gray-200 placeholder-gray-400"
              />
            </div>

            <button
              onClick={() => setShowArchived((prev) => !prev)}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors border ${
                showArchived
                  ? "bg-gray-700 text-white border-gray-600"
                  : "bg-primary-800 text-gray-400 border-primary-700 hover:text-gray-200 hover:bg-primary-700"
              }`}
            >
              {showArchived ? "Voltar aos Projetos" : "Arquivados"}
            </button>

            <div className="w-px h-8 bg-primary-700 mx-2" />

            <button
              onClick={() => router.push("/dashboard/projetos/novo")}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-2 px-6 text-[15px] font-semibold transition-colors shadow-lg shadow-primary-500/20"
            >
              + Projeto
            </button>

            <HeaderProfile />
          </div>
        </div>

        <section className="flex-1 h-full min-h-0 overflow-hidden pr-4 flex flex-col">
          {viewMode === "list" && renderListView()}
          {viewMode === "board" && renderBoardView()}
          {viewMode === "calendar" && renderCalendarView()}
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
            className={`fixed bottom-6 right-6 z-40 w-16 h-16 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all ${
              trashActive
                ? "bg-primary-500/90 border-primary-200 shadow-[0_0_30px_rgba(56,189,248,0.9)] scale-110"
                : "bg-primary-800/80 border-primary-700 shadow-[0_0_20px_rgba(15,23,42,0.7)]"
            }`}
          >
            <span className="text-2xl">🗑️</span>
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
                  <h2 className="text-[20px] text-primary-100 font-semibold">{confirm.title}</h2>
                </div>
                <p className="text-[15px] text-gray-200 leading-relaxed">{confirm.message}</p>
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