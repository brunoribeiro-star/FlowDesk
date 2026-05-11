import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { SkeletonList, SkeletonBoardCards } from "@/components/Skeleton";
import { Search, Package } from "lucide-react";

type ViewMode = "list" | "board" | "calendar";

type PortalProject = {
  id: string;
  titulo: string;
  status: string;
  progresso: number | null;
  prazo_entrega: string | null;
  data_inicio: string | null;
  cover_url: string | null;
};

function normalizeStatus(status: string): "em_andamento" | "concluido" {
  const s = String(status || "").toLowerCase().trim();
  if (s === "concluído" || s === "concluido" || s === "finalizado") return "concluido";
  return "em_andamento";
}

function statusLabel(ns: "em_andamento" | "concluido") {
  return ns === "concluido" ? "Concluído" : "Em andamento";
}

function statusPillClasses(ns: "em_andamento" | "concluido") {
  if (ns === "concluido") return "bg-third-400/15 text-third-300 border-third-400";
  return "bg-primary-500/15 text-primary-200 border-primary-500";
}

const BOARD_COLUMNS = [
  { status: "em_andamento" as const, label: "Em andamento" },
  { status: "concluido" as const, label: "Concluído" },
];

function getDaysInMonth(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
  return days;
}

export default function PortalProjetosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("portalProjetosViewMode") : null;
    if (saved === "list" || saved === "board" || saved === "calendar") setViewMode(saved as ViewMode);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const built = (memberRows ?? []).map((r: any) => r.projetos).filter(Boolean) as PortalProject[];
      setProjects(built);
      setLoading(false);
    })();
  }, []);

  const changeView = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("portalProjetosViewMode", v);
  };

  const statusByProject = useMemo(() => {
    const map: Record<string, "em_andamento" | "concluido"> = {};
    for (const p of projects) map[p.id] = normalizeStatus(p.status);
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.titulo.toLowerCase().includes(q));
  }, [projects, query]);

  const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  function renderViewToggle() {
    return (
      <div className="flex bg-primary-800 rounded-lg p-1 border border-primary-700">
        <button
          onClick={() => changeView("list")}
          className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"}`}
          title="Lista"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
        </button>
        <button
          onClick={() => changeView("board")}
          className={`p-2 rounded-md transition-all ${viewMode === "board" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"}`}
          title="Quadros"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
        </button>
        <button
          onClick={() => changeView("calendar")}
          className={`p-2 rounded-md transition-all ${viewMode === "calendar" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"}`}
          title="Calendário"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        </button>
      </div>
    );
  }

  function renderListView() {
    return (
      <div className="flex-1 bg-primary-900/40 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-primary-700 text-[13px] text-gray-400 flex items-center gap-4">
          <div className="flex-1 min-w-[280px]">Projeto</div>
          <div className="w-[160px] hidden md:block">Status</div>
          <div className="w-[180px] hidden md:block">Progresso</div>
          <div className="w-[130px] hidden md:block">Entrega</div>
        </div>

        <div className="flex-1 custom-scrollbar overflow-y-auto">
          {loading ? (
            <SkeletonList rows={5} cols={4} />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              {query ? "Nenhum projeto encontrado com essa busca." : "Nenhum projeto disponível."}
            </div>
          ) : (
            <div className="px-5 py-5 flex flex-col gap-3">
              {filtered.map((p) => {
                const ns = statusByProject[p.id];
                const pct = p.progresso ?? 0;
                const entregaTxt = p.prazo_entrega ? new Date(p.prazo_entrega + "T00:00:00").toLocaleDateString("pt-BR") : "—";

                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/portal/projeto/${p.id}`)}
                    className="group w-full bg-primary-900/45 hover:bg-primary-800/60 border border-primary-700 rounded-full px-5 py-3 flex items-center gap-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                      <div className="w-[72px] h-[46px] rounded-2xl overflow-hidden border border-primary-700 bg-primary-900 shrink-0">
                        <Image
                          src={p.cover_url || "/project-cover-placeholder.jpg"}
                          alt={p.titulo}
                          width={220}
                          height={140}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] text-gray-100 truncate">{p.titulo}</span>
                          <span className={`hidden md:inline-flex items-center px-3 py-1 rounded-full text-[12px] border ${statusPillClasses(ns)}`}>
                            {statusLabel(ns)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-[160px] hidden md:flex">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] border w-full ${statusPillClasses(ns)}`}>
                        {statusLabel(ns)}
                      </span>
                    </div>

                    <div className="w-[180px] hidden md:flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-0.5">
                        <span>Progresso</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-primary-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="w-[130px] hidden md:block">
                      <span className="text-[13px] text-gray-100">{entregaTxt}</span>
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
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 min-w-0"><SkeletonBoardCards count={2} /></div>
        ))}
      </div>
    );
    if (filtered.length === 0) return (
      <div className="mt-8 text-gray-400 text-[14px]">
        {query ? "Nenhum projeto encontrado com essa busca." : "Nenhum projeto disponível."}
      </div>
    );

    return (
      <div className="mt-6 overflow-y-auto pb-4 custom-scrollbar h-full">
        <div className="flex divide-x divide-primary-700 min-h-full">
          {BOARD_COLUMNS.map((col) => {
            const colProjects = filtered.filter((p) => statusByProject[p.id] === col.status);
            return (
              <div key={col.status} className="flex-1 min-w-0 px-4 flex flex-col">
                <div className="px-2 py-4 flex items-center gap-2 sticky top-0 bg-primary-900 z-10">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] border ${statusPillClasses(col.status)}`}>
                    {col.label}
                  </span>
                  <span className="text-[13px] text-gray-400">{colProjects.length}</span>
                </div>

                <div className="flex flex-col gap-4 pb-4 px-2 flex-1">
                  {colProjects.length === 0 ? (
                    <div className="text-[13px] text-gray-500 italic px-1">Nenhum projeto.</div>
                  ) : (
                    colProjects.map((p) => {
                      const pct = p.progresso ?? 0;
                      const entregaTxt = p.prazo_entrega ? new Date(p.prazo_entrega + "T00:00:00").toLocaleDateString("pt-BR") : "—";
                      return (
                        <div
                          key={p.id}
                          className="bg-primary-900/55 border border-primary-700 rounded-2xl overflow-hidden hover:border-primary-500 transition-colors"
                        >
                          <div className="relative w-full h-[120px] bg-primary-900 border-b border-primary-700">
                            <Image
                              src={p.cover_url || "/project-cover-placeholder.jpg"}
                              alt={p.titulo}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-primary-900/10 to-transparent" />
                          </div>

                          <div className="p-4 flex flex-col gap-3">
                            <div className="text-[15px] text-gray-100 font-medium line-clamp-2">{p.titulo}</div>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[12px] text-gray-400">
                                <span>Progresso</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-primary-700 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>

                            {p.prazo_entrega && (
                              <div className="text-[12px] text-gray-500">Prazo: {entregaTxt}</div>
                            )}

                            <button
                              type="button"
                              onClick={() => router.push(`/portal/projeto/${p.id}`)}
                              className="mt-1 w-full bg-primary-800 border border-primary-700 text-[13px] text-gray-200 rounded-xl py-2 hover:bg-primary-700 transition-colors"
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

  function renderCalendarView() {
    if (loading) return <div className="mt-8 text-gray-300">Carregando projetos...</div>;

    return (
      <div className="flex-1 overflow-hidden flex flex-col bg-primary-900/40 border border-primary-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={prevMonth} className="p-2 hover:bg-primary-800 rounded-full text-gray-400 hover:text-gray-100 transition-colors" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-xl font-bold text-gray-100 capitalize">
            {currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-primary-800 rounded-full text-gray-400 hover:text-gray-100 transition-colors" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-4 px-1">
          {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-400">{day}</div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-4 overflow-y-auto custom-scrollbar px-1 pb-2 mt-2">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;
            const dateStr = date.toISOString().split("T")[0];
            const dayProjects = filtered.filter((p) => p.prazo_entrega && p.prazo_entrega.startsWith(dateStr));
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={dateStr}
                className={`flex flex-col gap-2 p-3 rounded-2xl transition-all border min-h-[140px] ${
                  isToday ? "bg-primary-800/10 border-primary-500" : "bg-primary-800/20 border-transparent hover:bg-primary-800/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-lg font-bold ${isToday ? "text-primary-500" : "text-gray-100"}`}>{date.getDate()}</span>
                  {dayProjects.length > 0 && <span className="text-[10px] text-gray-500 font-medium">{dayProjects.length}</span>}
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1">
                  {dayProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/portal/projeto/${p.id}`)}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-primary-800 hover:bg-primary-700 transition-all shadow-sm min-w-0"
                      title={p.titulo}
                    >
                      <span className="text-[11px] font-medium truncate flex-1 text-gray-200">{p.titulo}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalProjetos = projects.length;

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <ClientSidebar defaultOpen={false} onOpenChange={() => {}} />

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

            <ClientHeaderProfile user={user} />
          </div>
        </div>

        {loading ? null : totalProjetos === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Package size={40} className="text-gray-600" />
            <p className="text-gray-500 text-[14px]">Nenhum projeto foi compartilhado com você ainda.</p>
          </div>
        ) : (
          <section className="flex-1 h-full min-h-0 overflow-hidden pr-4 flex flex-col">
            {viewMode === "list" && renderListView()}
            {viewMode === "board" && renderBoardView()}
            {viewMode === "calendar" && renderCalendarView()}
          </section>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background-color: var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-500); border-radius: 9999px; border: 2px solid var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-400); }
      `}</style>
    </div>
  );
}
