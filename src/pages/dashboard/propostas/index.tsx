"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  LayoutList,
  LayoutGrid,
  ArrowLeft,
  Trash2,
  Eye,
  Pencil,
  MoreVertical,
  Briefcase,
  Calendar,
  User,
  Link as LinkIcon,
} from "lucide-react";
import HeaderProfile from "@/components/HeaderProfile";
import Toast, { ToastType } from "@/components/Toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import Image from "next/image";
import { formatarData as formatDate } from "@/lib/utils";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";

const PROPOSTAS_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo às Propostas!", content: "Aqui você cria propostas comerciais profissionais para enviar aos seus clientes antes de fechar um contrato." },
  { target: "#tour-add-btn", placement: "bottom", skipBeacon: true, title: "Nova proposta", content: "Clique aqui para criar uma nova proposta. Você escolhe um template e edita todos os blocos: título, descrição, entregas, preço e muito mais." },
  { target: "body", placement: "center", skipBeacon: true, title: "Templates e personalização", content: "Existem templates prontos para diferentes tipos de projeto. Cada bloco é editável: textos, valores, cores e imagens. Tudo pode ser personalizado com a sua identidade visual." },
  { target: "body", placement: "center", skipBeacon: true, title: "Exportação em PDF", content: "Ao finalizar, exporte a proposta em PDF com um clique para enviar ao cliente por e-mail ou WhatsApp. A aparência é totalmente profissional." },
];

type ProposalStatus = "analisando" | "negociando" | "aceita" | "recusada" | "em_espera";

type Proposal = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  cover_url: string | null;
  created_at: string;
  client_id: string | null;
  public_token: string | null;
  description?: {
    clientName?: string;
    projectName?: string;
  };
};

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  analisando: { label: "Analisando", tone: "primary" },
  negociando: { label: "Negociando", tone: "alert"   },
  aceita:     { label: "Aceita",     tone: "success"  },
  recusada:   { label: "Recusada",   tone: "error"    },
  em_espera:  { label: "Em espera",  tone: "neutral"  },
};

const COLUMNS: { id: ProposalStatus; label: string }[] = [
  { id: "analisando", label: "Analisando" },
  { id: "negociando", label: "Negociando" },
  { id: "aceita",     label: "Aceita"     },
  { id: "recusada",   label: "Recusada"   },
  { id: "em_espera",  label: "Em espera"  },
];

export default function ProposalsList() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const isMobile = useIsMobile();
  const effectiveViewMode: "list" | "board" = isMobile ? "list" : viewMode;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  const [openBoardMenuId, setOpenBoardMenuId] = useState<string | null>(null);
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const savedView = localStorage.getItem("proposalsViewMode");
    if (savedView === "list" || savedView === "board") setViewMode(savedView);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const insideMenu =
        target.closest("[data-board-menu]") ||
        target.closest("[data-board-menu-trigger]");
      if (!insideMenu) {
        setOpenBoardMenuId(null);
        setOpenListMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, status, due_date, cover_url, created_at, client_id, public_token, description")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Erro ao carregar propostas:", error);
      else setProposals(data as any);
      setLoading(false);
    }
    loadProposals();
  }, []);

  const handleViewChange = (mode: "list" | "board") => {
    setViewMode(mode);
    localStorage.setItem("proposalsViewMode", mode);
  };

  async function handleStatusChange(id: string, newStatus: string) {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    const { error } = await supabase.from("proposals").update({ status: newStatus }).eq("id", id);
    if (error) console.error("Erro ao atualizar status:", error);
  }

  async function handleCopyLink(p: Proposal) {
    let token = p.public_token;

    if (!token) {
      token = crypto.randomUUID();
      const { error } = await supabase
        .from("proposals")
        .update({ public_token: token })
        .eq("id", p.id);

      if (error) {
        console.error("Erro ao gerar link:", error);
        showToast("Erro ao gerar link.", "error");
        return;
      }
      setProposals((prev) => prev.map((item) => (item.id === p.id ? { ...item, public_token: token } : item)));
    }

    const link = `${window.location.origin}/propostas/publica/${token}`;
    await navigator.clipboard.writeText(link);

    if (p.due_date && new Date(p.due_date + "T00:00:00") < new Date()) {
      showToast(
        `Link copiado, mas essa proposta venceu em ${new Date(p.due_date + "T00:00:00").toLocaleDateString("pt-BR")} — o cliente não conseguirá abrir.`,
        "error"
      );
    } else {
      showToast("Link copiado!", "success");
    }
  }

  async function deleteProposal(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    setDeleteModalId(null);
    await supabase.from("proposals").delete().eq("id", id);
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggingIdRef.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(colId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ProposalStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingIdRef.current || draggingId;
    if (!id) return;
    const proposal = proposals.find((p) => p.id === id);
    if (proposal && proposal.status !== targetStatus) handleStatusChange(id, targetStatus);
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const filteredProposals = useMemo(() => {
    if (!search) return proposals;
    const q = search.toLowerCase();
    return proposals.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.clientName?.toLowerCase().includes(q)
    );
  }, [proposals, search]);

  const renderListView = () => (
    <div className="pr-table flex-1 flex flex-col min-h-0">
      <div className="hidden md:block">
        <div className="pr-th">
          <span>Projeto / Cliente</span>
          <span>Status</span>
          <span>Data</span>
          <span className="pr-th-act">Ações</span>
        </div>
      </div>
      <div className="pr-rows gap-3 md:gap-0 p-3 md:p-0">
        {filteredProposals.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--gray-500)" }}>
            Nenhuma proposta encontrada
          </div>
        ) : (
          filteredProposals.map((p) => {
            const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.analisando;
            const actionsMenu = (
              <div className="relative">
                <button
                  data-board-menu-trigger
                  className="pr-iconmini"
                  onClick={() =>
                    setOpenListMenuId((cur) => (cur === p.id ? null : p.id))
                  }
                >
                  <MoreVertical size={18} />
                </button>
                {openListMenuId === p.id && (
                  <div
                    data-board-menu
                    className="absolute right-0 z-30 w-44 rounded-xl shadow-xl overflow-hidden"
                    style={{
                      top: "calc(100% + 6px)",
                      background: "var(--primary-800)",
                      border: "1px solid var(--primary-700)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setOpenListMenuId(null);
                        handleCopyLink(p);
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2 transition-colors"
                      style={{ color: "var(--gray-100)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-700)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <LinkIcon size={13} />
                      Copiar link
                    </button>
                    <div
                      className="px-4 pt-2.5 pb-1 text-[11px] uppercase tracking-wide"
                      style={{ color: "var(--gray-500)" }}
                    >
                      Alterar status
                    </div>
                    {COLUMNS.filter((col) => col.id !== p.status).map((col) => (
                      <button
                        key={col.id}
                        onClick={() => {
                          setOpenListMenuId(null);
                          handleStatusChange(p.id, col.id);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2 transition-colors"
                        style={{ color: "var(--gray-100)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-700)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {col.label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setOpenListMenuId(null);
                        setDeleteModalId(p.id);
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2 transition-colors"
                      style={{ color: "var(--error-medium)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-700)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            );
            return (
              <div key={p.id}>
                <div className="hidden md:block">
                <div
                  className="pr-row"
                  onClick={() => router.push(`/dashboard/propostas/${p.id}`)}
                >
                  <div className="pr-proj">
                    <span className="pr-cover">
                      <Briefcase size={20} />
                    </span>
                    <span className="pr-proj-txt">
                      <span className="pr-proj-name">{p.title}</span>
                      {p.description?.clientName && (
                        <span className="pr-proj-cli">
                          <User size={14} />
                          {p.description.clientName}
                        </span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className={`st st-${st.tone}`}>{st.label}</span>
                  </div>

                  <span className="pr-date">
                    <Calendar size={15} />
                    {formatDate(p.created_at)}
                  </span>

                  <div className="pr-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="pr-iconmini"
                      title="Ver proposta"
                      onClick={() => router.push(`/dashboard/propostas/${p.id}`)}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className="pr-iconmini"
                      title="Editar proposta"
                      onClick={() => router.push(`/dashboard/propostas/${p.id}?edit=true`)}
                    >
                      <Pencil size={17} />
                    </button>
                    {actionsMenu}
                  </div>
                </div>
                </div>

                <div
                  className="md:hidden flex flex-col gap-3 rounded-2xl border border-primary-700 bg-primary-800 p-4"
                  onClick={() => router.push(`/dashboard/propostas/${p.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="pr-cover">
                      <Briefcase size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="pr-proj-name">{p.title}</div>
                      {p.description?.clientName && (
                        <span className="pr-proj-cli">
                          <User size={14} />
                          {p.description.clientName}
                        </span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>{actionsMenu}</div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className={`st st-${st.tone}`}>{st.label}</span>
                    <span className="pr-date">
                      <Calendar size={14} />
                      {formatDate(p.created_at)}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-2 pt-2 border-t"
                    style={{ borderColor: "var(--gray-700)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px]"
                      style={{ background: "var(--primary-700)", color: "var(--gray-100)" }}
                      onClick={() => router.push(`/dashboard/propostas/${p.id}`)}
                    >
                      <Eye size={16} /> Ver
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px]"
                      style={{ background: "var(--primary-700)", color: "var(--gray-100)" }}
                      onClick={() => router.push(`/dashboard/propostas/${p.id}?edit=true`)}
                    >
                      <Pencil size={15} /> Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderBoardView = () => (
    <div className="flex-1 overflow-y-auto overflow-x-auto pr-board-scroll">
      <div className="pr-board" style={{ minWidth: "900px" }}>
        {COLUMNS.map((col) => {
          const colProposals = filteredProposals.filter(
            (p) => (p.status || "analisando") === col.id
          );
          const st = STATUS_CONFIG[col.id];
          const isOver = dragOverColumn === col.id;

          return (
            <section
              key={col.id}
              className={`pr-bcol${isOver ? " pr-bcol-over" : ""}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="pr-bcol-head">
                <span className={`pr-bdot tone-${st.tone}`} />
                <span className="pr-bcol-title">{col.label}</span>
                <span className="pr-bcol-count">{colProposals.length}</span>
              </div>

              <div className="pr-bcards">
                {colProposals.length === 0 ? (
                  <div className="pr-bempty">—</div>
                ) : (
                  colProposals.map((p) => (
                    <article
                      key={p.id}
                      className={`pr-bcard${draggingId === p.id ? " pr-bcard-dragging" : ""}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/dashboard/propostas/${p.id}`)}
                    >
                      <div className="pr-bcover">
                        {p.cover_url && (
                          <Image
                            src={p.cover_url}
                            alt=""
                            fill
                            draggable={false}
                            className="object-cover"
                            style={{ opacity: 0.75 }}
                          />
                        )}
                        {!p.cover_url && <Briefcase size={26} />}

                        <div
                          className="absolute top-3 right-3 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            data-board-menu-trigger
                            className="pr-bcard-menu"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenBoardMenuId((cur) =>
                                cur === p.id ? null : p.id
                              );
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openBoardMenuId === p.id && (
                            <div
                              data-board-menu
                              className="absolute right-0 z-30 w-36 rounded-xl shadow-xl overflow-hidden"
                              style={{
                                top: "calc(100% + 6px)",
                                background: "var(--primary-800)",
                                border: "1px solid var(--primary-700)",
                              }}
                            >
                              {[
                                { label: "Ver", icon: <Eye size={13} />, action: () => router.push(`/dashboard/propostas/${p.id}`) },
                                { label: "Editar", icon: <Pencil size={13} />, action: () => router.push(`/dashboard/propostas/${p.id}?edit=true`) },
                              ].map(({ label, icon, action }) => (
                                <button
                                  key={label}
                                  onClick={(e) => { e.stopPropagation(); setOpenBoardMenuId(null); action(); }}
                                  className="w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2 transition-colors"
                                  style={{ color: "var(--gray-100)" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-700)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  {icon} {label}
                                </button>
                              ))}
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenBoardMenuId(null); setDeleteModalId(p.id); }}
                                className="w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2 transition-colors"
                                style={{ color: "var(--error-medium)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-700)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <Trash2 size={13} /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pr-bcard-body">
                        <h3 className="pr-bcard-title">{p.title}</h3>
                        {p.description?.clientName && (
                          <span className="pr-bcard-cli">
                            <User size={14} />
                            {p.description.clientName}
                          </span>
                        )}
                        <div className="pr-bcard-foot">
                          <Calendar size={14} />
                          {formatDate(p.created_at)}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <PageTour name="propostas" steps={PROPOSTAS_TOUR_STEPS} />

      <div className="pr-page relative flex flex-col flex-1 h-full overflow-hidden">
        <div className="pr-glow pr-glow-a" />
        <div className="pr-glow pr-glow-b" />

        <header
          className="relative z-30 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 px-4 sm:px-6 lg:px-8 xl:px-11 py-4 lg:py-[16px] border-b"
          style={{ borderColor: "var(--gray-700)" }}
        >
          <div className="flex items-center justify-between gap-3 lg:contents">
            <button
              type="button"
              className="pr-back-btn"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <HeaderProfile />
            </div>
          </div>

          <label className="pr-search-bar" style={{ flex: 1 }}>
            <Search size={19} />
            <input
              type="text"
              placeholder="Buscar propostas…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="hidden lg:block">
            <div className="pr-seg-ctrl">
              <button
                type="button"
                className={`pr-seg-btn${viewMode === "list" ? " is-on" : ""}`}
                onClick={() => handleViewChange("list")}
                title="Visualização em lista"
              >
                <LayoutList size={19} />
              </button>
              <button
                type="button"
                className={`pr-seg-btn${viewMode === "board" ? " is-on" : ""}`}
                onClick={() => handleViewChange("board")}
                title="Visualização em quadros"
              >
                <LayoutGrid size={19} />
              </button>
            </div>
          </div>

          <button
            id="tour-add-btn"
            type="button"
            className="pr-nova-btn justify-center"
            onClick={() => router.push("/dashboard/propostas/nova")}
          >
            <Plus size={19} />
            Nova Proposta
          </button>

          <div className="hidden lg:block">
            <HeaderProfile />
          </div>
        </header>

        <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 xl:px-11 pt-4 sm:pt-6 pb-6 sm:pb-8 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--primary-500)", borderTopColor: "transparent" }}
              />
            </div>
          ) : effectiveViewMode === "list" ? (
            renderListView()
          ) : (
            renderBoardView()
          )}
        </main>
      </div>

      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 flex flex-col gap-5"
            style={{ background: "var(--primary-900)", border: "1px solid var(--primary-700)" }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(239,83,80,0.10)", border: "1px solid rgba(239,83,80,0.30)" }}
              >
                <Trash2 size={22} style={{ color: "var(--error-medium)" }} />
              </div>
              <div>
                <h2 className="text-[16px] font-medium" style={{ color: "var(--gray-100)" }}>
                  Excluir proposta
                </h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--gray-400)" }}>
                  Esta ação não pode ser desfeita. A proposta será removida permanentemente.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 py-2.5 rounded-xl text-[14px] transition-colors"
                style={{
                  border: "1px solid var(--primary-700)",
                  background: "var(--primary-800)",
                  color: "var(--gray-200)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteProposal(deleteModalId)}
                className="flex-1 py-2.5 rounded-xl text-white text-[14px] font-medium transition-colors"
                style={{ background: "var(--error-medium)" }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* ── Page wrapper ── */
        .pr-page {
          background: radial-gradient(
            120% 80% at 50% -10%,
            var(--primary-800) 0%,
            var(--primary-900) 55%,
            var(--primary-900) 100%
          );
          -webkit-font-smoothing: antialiased;
        }

        /* ── Glow effects ── */
        .pr-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }
        .pr-glow-a {
          width: 520px;
          height: 520px;
          right: -180px;
          top: -180px;
          background: radial-gradient(circle, rgba(30, 182, 232, 0.12), transparent 70%);
        }
        .pr-glow-b {
          width: 460px;
          height: 460px;
          right: -160px;
          bottom: -200px;
          background: radial-gradient(circle, rgba(16, 66, 83, 0.5), transparent 70%);
        }

        /* ── Back button ── */
        .pr-back-btn {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 13px;
          flex: none;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-200);
          cursor: pointer;
          transition: 0.2s;
        }
        .pr-back-btn:hover {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }

        /* ── Search bar ── */
        .pr-search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 52px;
          padding: 0 18px;
          border-radius: 14px;
          color: var(--gray-400);
          background: var(--primary-800);
          border: 1px solid var(--gray-700);
          transition: 0.2s;
        }
        .pr-search-bar:focus-within {
          border-color: var(--primary-500);
        }
        .pr-search-bar input {
          flex: 1;
          background: none;
          border: 0;
          outline: none;
          color: var(--gray-100);
          font-family: inherit;
          font-size: 15.5px;
        }
        .pr-search-bar input::placeholder {
          color: var(--gray-500);
        }

        /* ── Segmented control ── */
        .pr-seg-ctrl {
          display: flex;
          gap: 4px;
          padding: 5px;
          border-radius: 13px;
          background: var(--primary-800);
          border: 1px solid var(--gray-700);
        }
        .pr-seg-ctrl .pr-seg-btn {
          display: grid;
          place-items: center;
          width: 44px;
          height: 40px;
          border-radius: 10px;
          border: 0;
          background: none;
          color: var(--gray-400);
          cursor: pointer;
          transition: 0.2s;
        }
        .pr-seg-ctrl .pr-seg-btn:hover {
          color: var(--primary-300);
        }
        /* var(--primary-900) = escuro no dark, claro no light — contraste garantido em ambos */
        .pr-seg-ctrl .pr-seg-btn.is-on {
          color: var(--primary-900);
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
          box-shadow: 0 6px 16px -6px rgba(30, 182, 232, 0.7);
        }

        /* ── Nova Proposta button ── */
        .pr-nova-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          height: 52px;
          padding: 0 24px;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          border: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30, 182, 232, 0.8);
          transition: 0.2s;
          white-space: nowrap;
        }
        .pr-nova-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px -10px rgba(30, 182, 232, 0.9);
        }

        /* ── List table ── */
        .pr-table {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--gray-700);
          border-radius: 22px;
          overflow: hidden;
          background: var(--primary-800);
        }
        .pr-th,
        .pr-row {
          display: grid;
          align-items: center;
          gap: 20px;
          grid-template-columns: 2.6fr 1.2fr 1fr 1fr;
        }
        .pr-th {
          padding: 20px 30px;
          border-bottom: 1px solid var(--gray-700);
        }
        .pr-th span {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gray-400);
        }
        .pr-th-act {
          text-align: right;
        }
        .pr-rows {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .pr-rows::-webkit-scrollbar {
          width: 8px;
        }
        .pr-rows::-webkit-scrollbar-track {
          background: transparent;
        }
        .pr-rows::-webkit-scrollbar-thumb {
          background: var(--primary-600);
          border-radius: 8px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        .pr-row {
          padding: 18px 30px;
          border-bottom: 1px solid var(--gray-700);
          transition: background 0.2s;
          cursor: pointer;
        }
        .pr-row:last-child {
          border-bottom: 0;
        }
        .pr-row:hover {
          background: var(--primary-700);
        }
        .pr-proj {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .pr-cover {
          flex: none;
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          border-radius: 14px;
          color: var(--primary-200);
          border: 1px solid var(--gray-700);
          background: radial-gradient(130% 130% at 30% 20%, var(--primary-600), var(--primary-700));
        }
        .pr-proj-txt {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .pr-proj-name {
          font-size: 17px;
          font-weight: 600;
          color: var(--gray-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pr-proj-cli {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          color: var(--gray-400);
        }
        .pr-proj-cli svg {
          flex: none;
          color: var(--gray-500);
        }
        .pr-date {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 14.5px;
          color: var(--gray-300);
          font-variant-numeric: tabular-nums;
        }
        .pr-date svg {
          flex: none;
          color: var(--gray-500);
        }
        .pr-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
        }
        .pr-iconmini {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 0;
          background: none;
          color: var(--gray-400);
          cursor: pointer;
          transition: 0.2s;
        }
        .pr-iconmini:hover {
          background: var(--primary-700);
          color: var(--gray-100);
        }

        /* ── Status badges ── */
        .st {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid currentColor;
          white-space: nowrap;
        }
        .st::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 8px currentColor;
          flex: none;
        }
        .st-primary {
          color: var(--primary-300);
          background: rgba(30, 182, 232, 0.1);
          border-color: rgba(30, 182, 232, 0.35);
        }
        .st-alert {
          color: var(--alert-medium);
          background: rgba(255, 167, 38, 0.1);
          border-color: rgba(255, 167, 38, 0.35);
        }
        .st-error {
          color: var(--error-medium);
          background: rgba(239, 83, 80, 0.1);
          border-color: rgba(239, 83, 80, 0.35);
        }
        .st-success {
          color: var(--success-medium);
          background: rgba(102, 187, 106, 0.1);
          border-color: rgba(102, 187, 106, 0.35);
        }
        .st-neutral {
          color: var(--gray-300);
          background: rgba(148, 169, 173, 0.1);
          border-color: rgba(148, 169, 173, 0.35);
        }

        /* ── Board ── */
        .pr-board-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .pr-board-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .pr-board-scroll::-webkit-scrollbar-thumb {
          background: var(--primary-600);
          border-radius: 8px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        .pr-board {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 18px;
          align-items: start;
          padding-bottom: 8px;
        }
        .pr-bcol {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pr-bcol-over > .pr-bcards {
          background: var(--primary-700);
          border-radius: 14px;
        }
        .pr-bcol-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 4px 14px;
          border-bottom: 1px solid var(--gray-700);
        }
        .pr-bdot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex: none;
        }
        .pr-bdot.tone-primary {
          background: var(--primary-400);
          box-shadow: 0 0 10px -1px var(--primary-500);
        }
        .pr-bdot.tone-alert {
          background: var(--alert-medium);
          box-shadow: 0 0 10px -1px var(--alert-medium);
        }
        .pr-bdot.tone-success {
          background: var(--success-medium);
          box-shadow: 0 0 10px -1px var(--success-medium);
        }
        .pr-bdot.tone-error {
          background: var(--error-medium);
          box-shadow: 0 0 10px -1px var(--error-medium);
        }
        .pr-bdot.tone-neutral {
          background: var(--gray-500);
        }
        .pr-bcol-title {
          flex: 1;
          font-size: 15.5px;
          font-weight: 600;
          color: var(--gray-100);
        }
        .pr-bcol-count {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--gray-400);
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: var(--primary-700);
        }
        .pr-bcards {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 60px;
          transition: background 0.2s;
        }
        .pr-bempty {
          padding: 24px;
          border-radius: 14px;
          border: 1px dashed var(--gray-700);
          text-align: center;
          color: var(--gray-400);
        }
        .pr-bcard {
          border-radius: 18px;
          border: 1px solid var(--gray-700);
          overflow: hidden;
          background: var(--primary-800);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          transition: 0.2s;
          cursor: pointer;
        }
        .pr-bcard:hover {
          border-color: var(--primary-500);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px -16px rgba(0, 0, 0, 0.3);
        }
        .pr-bcard-dragging {
          opacity: 0.5;
          border-color: var(--primary-500) !important;
        }
        .pr-bcover {
          position: relative;
          height: 96px;
          display: grid;
          place-items: center;
          color: var(--primary-200);
          background: radial-gradient(130% 130% at 30% 20%, var(--primary-600), var(--primary-700));
        }
        .pr-bcard-menu {
          position: absolute;
          top: 12px;
          right: 12px;
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 0;
          background: var(--primary-900);
          color: var(--gray-100);
          cursor: pointer;
          backdrop-filter: blur(4px);
          transition: 0.2s;
        }
        .pr-bcard-menu:hover {
          background: var(--primary-800);
        }
        .pr-bcard-body {
          padding: 16px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pr-bcard-title {
          margin: 0;
          font-size: 16.5px;
          font-weight: 600;
          color: var(--gray-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pr-bcard-cli {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          color: var(--gray-400);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pr-bcard-cli svg {
          flex: none;
          color: var(--gray-500);
        }
        .pr-bcard-foot {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding-top: 12px;
          border-top: 1px solid var(--gray-700);
          font-size: 13px;
          color: var(--gray-500);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </>
  );
}
