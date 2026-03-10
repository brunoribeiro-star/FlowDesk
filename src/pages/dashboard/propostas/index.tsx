"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  User, 
  ChevronDown, 
  LayoutList, 
  LayoutGrid, 
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  AlertCircle
} from "lucide-react";
import HeaderProfile from "@/components/HeaderProfile";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList, SkeletonBoardCards } from "@/components/Skeleton";

type ProposalStatus = "analisando" | "negociando" | "aceita" | "recusada" | "em_espera";

type Proposal = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  cover_url: string | null;
  created_at: string;
  client_id: string | null;
  description?: {
    clientName?: string;
    projectName?: string;
  };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; icon: any }> = {
  analisando: { 
    label: "Analisando", 
    color: "text-blue-400 bg-blue-400/10", 
    border: "border-blue-400/20",
    icon: Clock 
  },
  negociando: { 
    label: "Negociando", 
    color: "text-amber-400 bg-amber-400/10", 
    border: "border-amber-400/20",
    icon: MessageCircle 
  },
  aceita: { 
    label: "Aceita", 
    color: "text-emerald-400 bg-emerald-400/10", 
    border: "border-emerald-400/20",
    icon: CheckCircle2 
  },
  recusada: { 
    label: "Recusada", 
    color: "text-rose-400 bg-rose-400/10", 
    border: "border-rose-400/20",
    icon: XCircle 
  },
  em_espera: { 
    label: "Em espera", 
    color: "text-purple-400 bg-purple-400/10", 
    border: "border-purple-400/20",
    icon: AlertCircle 
  },
};

const COLUMNS: { id: ProposalStatus; label: string }[] = [
  { id: "analisando", label: "Analisando" },
  { id: "negociando", label: "Negociando" },
  { id: "aceita", label: "Aceita" },
  { id: "recusada", label: "Recusada" },
  { id: "em_espera", label: "Em espera" },
];

export default function ProposalsList() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  const [openBoardMenuId, setOpenBoardMenuId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  useEffect(() => {
    const savedView = localStorage.getItem("proposalsViewMode");
    if (savedView === "list" || savedView === "board") {
      setViewMode(savedView);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const insideMenu =
        target.closest("[data-board-menu]") ||
        target.closest("[data-board-menu-trigger]");
      if (!insideMenu) setOpenBoardMenuId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadProposals() {
      if (!authUser) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("proposals")
        .select(`id, title, status, due_date, cover_url, created_at, client_id, description`)
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar propostas:", error);
      } else {
        setProposals(data as any);
      }
      setLoading(false);
    }

    loadProposals();
  }, [authUser]);

  const handleViewChange = (mode: "list" | "board") => {
    setViewMode(mode);
    localStorage.setItem("proposalsViewMode", mode);
  };

  async function handleStatusChange(id: string, newStatus: string) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) console.error("Erro ao atualizar status:", error);
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
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ProposalStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingIdRef.current || draggingId;
    if (!id) return;

    const proposal = proposals.find(p => p.id === id);
    if (proposal && proposal.status !== targetStatus) {
      handleStatusChange(id, targetStatus);
    }
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const filteredProposals = useMemo(() => {
    if (!search) return proposals;
    const lowerSearch = search.toLowerCase();
    return proposals.filter(p => 
      p.title.toLowerCase().includes(lowerSearch) ||
      p.description?.clientName?.toLowerCase().includes(lowerSearch)
    );
  }, [proposals, search]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
  }

  const renderBoardView = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="flex gap-4 w-full overflow-x-auto pb-4 px-1">
        {COLUMNS.map((col) => {
          const colProposals = filteredProposals.filter(
            (p) => (p.status || "analisando") === col.id
          );
          const config = STATUS_CONFIG[col.id];
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-1 min-w-0 flex flex-col gap-4 rounded-xl transition-colors`}
            >
              <div className="py-4 flex items-center justify-between border-b border-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.color.split(' ')[0].replace('text-', 'bg-')}`} />
                  <span className="font-semibold text-sm text-gray-200">{col.label}</span>
                  <span className="text-xs text-gray-500 ml-1">{colProposals.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 min-h-[200px]">
                {colProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, proposal.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => router.push(`/dashboard/propostas/${proposal.id}`)}
                    className={`w-full bg-primary-900/40 border border-gray-700 rounded-2xl overflow-hidden cursor-pointer hover:border-primary-500 transition-colors group ${
                      draggingId === proposal.id ? 'opacity-60 border-primary-500' : ''
                    }`}
                  >
                    <div className="relative w-full h-[120px] bg-primary-900 border-b border-gray-700">
                      <Image
                        src={proposal.cover_url || "/project-cover-placeholder.jpg"}
                        alt="Cover"
                        fill
                        draggable={false}
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-primary-900/10 to-transparent" />

                      <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          data-board-menu-trigger
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenBoardMenuId((cur) =>
                              cur === proposal.id ? null : proposal.id
                            );
                          }}
                          className="p-1.5 rounded-lg bg-primary-900/60 backdrop-blur-sm hover:bg-primary-800 text-gray-300 hover:text-white transition-colors"
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {openBoardMenuId === proposal.id && (
                          <div
                            data-board-menu
                            className="absolute right-0 top-8 z-30 w-36 bg-primary-800 border border-primary-700 rounded-xl shadow-xl overflow-hidden"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenBoardMenuId(null);
                                router.push(`/dashboard/propostas/${proposal.id}`);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                            >
                              <ExternalLink size={13} /> Ver
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenBoardMenuId(null);
                                router.push(`/dashboard/propostas/${proposal.id}?edit=true`);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                            >
                              <FileText size={13} /> Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenBoardMenuId(null);
                                setDeleteModalId(proposal.id);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[13px] text-rose-400 hover:bg-primary-700 flex items-center gap-2"
                            >
                              <Trash2 size={13} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] text-gray-100 font-medium line-clamp-2 mb-1">
                            {proposal.title}
                          </h3>
                          {proposal.description?.clientName && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                              <User size={12} className="shrink-0" />
                              <span className="truncate">{proposal.description.clientName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-700">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                          <Calendar size={12} />
                          <span>{formatDate(proposal.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="bg-primary-900/40 border border-gray-700 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full">
                <thead className="sticky top-0 z-10 bg-primary-900 shadow-sm">
                    <tr className="border-b border-gray-700">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-[40%]">Projeto / Cliente</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {filteredProposals.map((proposal) => {
                         const config = STATUS_CONFIG[proposal.status] || STATUS_CONFIG['analisando'];
                         const StatusIcon = config.icon;

                         return (
                            <tr 
                                key={proposal.id} 
                                className="group hover:bg-primary-800/40 transition-colors cursor-pointer"
                                onClick={() => router.push(`/dashboard/propostas/${proposal.id}`)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-gray-100 text-[15px]">{proposal.title}</span>
                                        {proposal.description?.clientName && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <User size={12} />
                                                <span>{proposal.description.clientName}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${config.border} bg-opacity-10`}>
                                        <StatusIcon size={12} />
                                        <span>{config.label}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-400">{formatDate(proposal.created_at)}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        className="p-2 text-gray-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/dashboard/propostas/${proposal.id}`);
                                        }}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </td>
                            </tr>
                         )
                    })}
                    {filteredProposals.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                Nenhuma proposta encontrada
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans selection:bg-primary-500/30 overflow-hidden">
      <Sidebar defaultOpen={sidebarOpen} onOpenChange={setSidebarOpen} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-gray-700 bg-primary-900/50 backdrop-blur-md flex items-center justify-between px-6 md:px-8 z-10 shrink-0">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-100 hover:bg-primary-800 rounded-xl transition-all"
                    title="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-px h-6 bg-gray-700" />
                <h1 className="text-xl font-bold text-gray-100 tracking-tight">Propostas</h1>
            </div>

            <div className="flex items-center gap-4">
                <HeaderProfile />
            </div>
        </header>

        <div className="px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                    type="text"
                    placeholder="Buscar propostas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-primary-900 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all"
                />
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center bg-primary-900 border border-gray-700 rounded-xl p-1">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleViewChange("list")}
                            className={`p-2 rounded-lg transition-all ${
                                viewMode === "list" 
                                    ? "bg-primary-800 text-gray-100 shadow-sm" 
                                    : "text-gray-400 hover:text-gray-200 hover:bg-primary-800/50"
                            }`}
                            title="Visualização em Lista"
                        >
                            <LayoutList size={18} />
                        </button>
                        <button
                            onClick={() => handleViewChange("board")}
                            className={`p-2 rounded-lg transition-all ${
                                viewMode === "board" 
                                    ? "bg-primary-800 text-gray-100 shadow-sm" 
                                    : "text-gray-400 hover:text-gray-200 hover:bg-primary-800/50"
                            }`}
                            title="Visualização em Quadros"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-700" />

                <button
                    onClick={() => router.push("/dashboard/propostas/nova")}
                    className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nova Proposta</span>
                </button>
            </div>
        </div>

        <main className="flex-1 overflow-hidden px-6 md:px-8 pb-8 flex flex-col">
            {loading ? (
                viewMode === "list"
                  ? <SkeletonList rows={6} cols={4} />
                  : <div className="flex gap-4 w-full pt-4">{Array.from({length:5}).map((_,i)=><div key={i} className="flex-1 min-w-0"><SkeletonBoardCards count={2} /></div>)}</div>
            ) : (
                viewMode === "list" ? renderListView() : renderBoardView()
            )}
        </main>
      </div>

      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-primary-900 border border-primary-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Trash2 size={22} className="text-rose-400" />
              </div>
              <div>
                <h2 className="text-[16px] font-medium text-gray-100">
                  Excluir proposta
                </h2>
                <p className="text-[13px] text-gray-400 mt-1">
                  Esta ação não pode ser desfeita. A proposta será removida permanentemente.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 py-2.5 rounded-xl border border-primary-700 bg-primary-800 text-gray-200 text-[14px] hover:bg-primary-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteProposal(deleteModalId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-[14px] transition-colors font-medium"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

       <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: var(--primary-900);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-500);
          border-radius: 4px;
          border: 2px solid var(--primary-900);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-400);
        }
      `}</style>
    </div>
  );
}
