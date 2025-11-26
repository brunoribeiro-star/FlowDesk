import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, Calendar, User, ChevronDown } from "lucide-react";
import HeaderProfile from "@/components/HeaderProfile";

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

const STATUS_LABELS: Record<string, { label: string; color: string; dotColor: string }> = {
  analisando: { label: "Analisando", color: "bg-blue-500/20 text-blue-300", dotColor: "bg-blue-500" },
  negociando: { label: "Negociando", color: "bg-yellow-500/20 text-yellow-300", dotColor: "bg-yellow-500" },
  aceita: { label: "Aceita", color: "bg-emerald-500/20 text-emerald-300", dotColor: "bg-emerald-500" },
  recusada: { label: "Recusada", color: "bg-red-500/20 text-red-300", dotColor: "bg-red-500" },
  em_espera: { label: "Em espera", color: "bg-purple-500/20 text-purple-300", dotColor: "bg-purple-500" },
};

export default function ProposalsList() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id,
          title,
          status,
          due_date,
          cover_url,
          created_at,
          client_id,
          description
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar propostas:", error);
      } else {
        setProposals(data as any);
      }
      setLoading(false);
    }

    loadProposals();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-status-menu]")) {
        setOpenStatusMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    setOpenStatusMenuId(null);
    
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status.");
    }
  }

  const filteredProposals = proposals.filter((p) => {
    const term = search.toLowerCase();
    const clientName = p.description?.clientName?.toLowerCase() || "";
    return (
      p.title.toLowerCase().includes(term) ||
      clientName.includes(term)
    );
  });

  return (
    <div className="min-h-screen w-full bg-primary-900 flex gap-6 overflow-hidden text-gray-100">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 min-w-0 gap-6 pr-6 py-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold">Propostas</h1>
            <p className="text-slate-400 text-sm mt-1">
              Gerencie suas propostas comerciais
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar proposta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-primary-800 border border-primary-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
            <button
              onClick={() => router.push("/dashboard/propostas/nova")}
              className="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm whitespace-nowrap transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Proposta
            </button>
            
            <HeaderProfile />
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-primary-800/30 rounded-2xl border border-primary-800 border-dashed">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">Nenhuma proposta encontrada</p>
            <p className="text-sm">Crie sua primeira proposta para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filteredProposals.map((proposal) => {
              const statusInfo = STATUS_LABELS[proposal.status?.toLowerCase()] || {
                label: proposal.status,
                color: "bg-slate-700 text-slate-300",
                dotColor: "bg-slate-500",
              };

              return (
                <div
                  key={proposal.id}
                  className="group bg-primary-800 border border-primary-700 rounded-xl hover:border-primary-500 transition-all flex flex-col relative"
                >
                  <div 
                    className="h-40 bg-primary-900 relative rounded-t-xl cursor-pointer"
                    onClick={() => router.push(`/dashboard/propostas/${proposal.id}`)}
                  >
                    <div className="absolute inset-0 rounded-t-xl overflow-hidden">
                      {proposal.cover_url ? (
                        <img
                          src={proposal.cover_url}
                          alt={proposal.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-900 text-primary-700">
                          <FileText className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className="absolute top-3 right-3 z-20"
                      data-status-menu
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <button
                        onClick={() => setOpenStatusMenuId(openStatusMenuId === proposal.id ? null : proposal.id)}
                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1 hover:brightness-110 transition-all ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                        <ChevronDown size={12} />
                      </button>

                      {openStatusMenuId === proposal.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-primary-800 border border-primary-600 rounded-lg shadow-xl py-1 z-30 animate-fade-in overflow-hidden">
                          {Object.entries(STATUS_LABELS).map(([key, info]) => (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(proposal.id, key)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-primary-700 transition-colors flex items-center gap-2 ${
                                proposal.status === key ? "bg-primary-700/50" : ""
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${info.dotColor}`} />
                              <span className={proposal.status === key ? "text-primary-100 font-semibold" : "text-gray-300"}>
                                {info.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div 
                    className="p-5 flex flex-col gap-3 flex-1 cursor-pointer rounded-b-xl"
                    onClick={() => router.push(`/dashboard/propostas/${proposal.id}`)}
                  >
                    <div>
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-primary-400 transition-colors line-clamp-2">
                        {proposal.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-2">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">
                          {proposal.description?.clientName || "Cliente sem nome"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-primary-700/50 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {proposal.due_date
                            ? new Date(proposal.due_date).toLocaleDateString(
                                "pt-BR"
                              )
                            : "Sem data"}
                        </span>
                      </div>
                      <span>
                        Criado em{" "}
                        {new Date(proposal.created_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
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
