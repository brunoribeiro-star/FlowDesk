import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { SkeletonList, SkeletonBoardCards } from "@/components/Skeleton";
import { Search, Package, List, LayoutGrid, Calendar, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

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

function ProjectCoverSmall({ p }: { p: PortalProject }) {
  if (p.cover_url) {
    return (
      <div className="cp-cover">
        <Image src={p.cover_url} alt={p.titulo} width={52} height={52} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="cp-cover cp-cover-grad">
      <span>{p.titulo.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function CpProgress({ pct }: { pct: number }) {
  return (
    <div className="cp-prog">
      <div className="cp-prog-head">
        <span>Progresso</span>
        <span className="cp-prog-pct">{pct}%</span>
      </div>
      <div className="cp-prog-track">
        <span className="cp-prog-fill" style={{ width: `${pct > 0 ? Math.max(pct, 2) : 0}%` }} />
      </div>
    </div>
  );
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

  const totalProjetos = projects.length;

  const calMonthTitle = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const calMonthFormatted = calMonthTitle.charAt(0).toUpperCase() + calMonthTitle.slice(1);

  function renderListView() {
    return (
      <div className="cp-table">
        <div className="cp-thead">
          <span>Projeto</span>
          <span>Status</span>
          <span>Progresso</span>
          <span className="cp-th-right">Entrega</span>
        </div>
        <div className="cp-rows">
          {loading ? (
            <SkeletonList rows={5} cols={4} />
          ) : filtered.length === 0 ? (
            <div className="cp-empty">
              <span className="cp-empty-ico"><Package size={26} strokeWidth={1.8} /></span>
              <p style={{ margin: 0, fontSize: "15.5px", color: "var(--gray-500)" }}>
                {query ? "Nenhum projeto encontrado." : "Nenhum projeto disponível."}
              </p>
            </div>
          ) : (
            filtered.map((p) => {
              const ns = statusByProject[p.id];
              const pct = p.progresso ?? 0;
              const entregaTxt = p.prazo_entrega
                ? new Date(p.prazo_entrega + "T00:00:00").toLocaleDateString("pt-BR")
                : "—";
              return (
                <div key={p.id} className="cp-row" onClick={() => router.push(`/portal/projeto/${p.id}`)}>
                  <div className="cp-row-proj">
                    <ProjectCoverSmall p={p} />
                    <span className="cp-row-name">{p.titulo}</span>
                  </div>
                  <div>
                    <span className={`cp-status ${ns === "concluido" ? "done" : "doing"}`}>
                      <span className="cp-status-dot" />
                      {statusLabel(ns)}
                    </span>
                  </div>
                  <CpProgress pct={pct} />
                  <div className="cp-row-due">{entregaTxt}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderBoardView() {
    if (loading) {
      return (
        <div className="cp-board">
          {[1, 2].map((i) => (
            <div key={i}><SkeletonBoardCards count={2} /></div>
          ))}
        </div>
      );
    }

    return (
      <div className="cp-board">
        {BOARD_COLUMNS.map((col) => {
          const colProjects = filtered.filter((p) => statusByProject[p.id] === col.status);
          const isDoing = col.status === "em_andamento";
          return (
            <section key={col.status} className="cp-col">
              <div className="cp-col-head">
                <span className={`cp-col-pill ${isDoing ? "doing" : "done"}`}>{col.label}</span>
                <span className="cp-col-count">{colProjects.length}</span>
              </div>
              <div className="cp-col-cards">
                {colProjects.length === 0 ? (
                  <p className="cp-col-empty">Nenhum projeto.</p>
                ) : (
                  colProjects.map((p) => {
                    const pct = p.progresso ?? 0;
                    const entregaTxt = p.prazo_entrega
                      ? new Date(p.prazo_entrega + "T00:00:00").toLocaleDateString("pt-BR")
                      : null;
                    return (
                      <article key={p.id} className="cp-card">
                        <div className="cp-card-cover">
                          {p.cover_url ? (
                            <Image src={p.cover_url} alt={p.titulo} fill className="object-cover" />
                          ) : (
                            <span className="cp-card-cover-letter">{p.titulo.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="cp-card-body">
                          <h3 className="cp-card-name">{p.titulo}</h3>
                          <CpProgress pct={pct} />
                          {entregaTxt && <p className="cp-card-due">Prazo: {entregaTxt}</p>}
                          <button
                            type="button"
                            className="cp-card-btn"
                            onClick={() => router.push(`/portal/projeto/${p.id}`)}
                          >
                            Ver detalhes <ArrowRight size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  function renderCalendarView() {
    if (loading) {
      return (
        <div className="cp-cal">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <span style={{ color: "var(--gray-500)" }}>Carregando...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="cp-cal">
        <div className="cp-cal-head">
          <button type="button" className="cp-cal-nav" onClick={prevMonth}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="cp-cal-title">{calMonthFormatted}</h2>
          <button type="button" className="cp-cal-nav" onClick={nextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="cp-cal-weekdays">
          {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d) => (
            <span key={d} className="cp-cal-weekday">{d}</span>
          ))}
        </div>
        <div className="cp-cal-grid">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={`e-${i}`} className="cp-cal-cell empty" />;
            const dateStr = date.toISOString().split("T")[0];
            const dayProjects = filtered.filter((p) => p.prazo_entrega && p.prazo_entrega.startsWith(dateStr));
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div key={dateStr} className={`cp-cal-cell${isToday ? " today" : ""}`}>
                <span className="cp-cal-day">{date.getDate()}</span>
                {dayProjects.map((p) => (
                  <span
                    key={p.id}
                    className="cp-cal-chip"
                    onClick={() => router.push(`/portal/projeto/${p.id}`)}
                  >
                    {p.titulo}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page">
      <ClientSidebar defaultOpen={false} onOpenChange={() => {}} />

      <div className="cp-content">
        <div className="cp-bg" />

        <header className="cp-top">
          <div className="cp-count">
            <b>{totalProjetos}</b>{" "}
            {totalProjetos === 1 ? "projeto" : "projetos"}
          </div>
          <div className="cp-top-right">
            <div className="cp-viewtabs">
              <button
                type="button"
                className={`cp-viewtab${viewMode === "list" ? " on" : ""}`}
                onClick={() => changeView("list")}
                title="Lista"
              >
                <List size={19} />
              </button>
              <button
                type="button"
                className={`cp-viewtab${viewMode === "board" ? " on" : ""}`}
                onClick={() => changeView("board")}
                title="Quadros"
              >
                <LayoutGrid size={19} />
              </button>
              <button
                type="button"
                className={`cp-viewtab${viewMode === "calendar" ? " on" : ""}`}
                onClick={() => changeView("calendar")}
                title="Calendário"
              >
                <Calendar size={19} />
              </button>
            </div>

            <label className="cp-search">
              <Search size={19} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
              />
            </label>

            <ClientHeaderProfile user={user} />
          </div>
        </header>

        {!loading && totalProjetos === 0 ? (
          <main className="cp-main">
            <div className="cp-empty">
              <span className="cp-empty-ico"><Package size={26} strokeWidth={1.8} /></span>
              <p style={{ margin: 0, fontSize: "15.5px", color: "var(--gray-500)" }}>
                Nenhum projeto foi compartilhado com você ainda.
              </p>
            </div>
          </main>
        ) : (
          <main className="cp-main">
            {viewMode === "list" && renderListView()}
            {viewMode === "board" && renderBoardView()}
            {viewMode === "calendar" && renderCalendarView()}
          </main>
        )}
      </div>

      <style jsx global>{`
        /* ====== Portal Projetos — Redesign ====== */

        .cp-page {
          height: 100vh; width: 100%; display: flex; overflow: hidden;
          background: var(--primary-900); color: var(--gray-100);
          -webkit-font-smoothing: antialiased;
        }

        .cp-content {
          display: flex; flex-direction: column; flex: 1; min-width: 0;
          position: relative; overflow: hidden;
        }

        .cp-bg {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(60% 50% at 85% 0%,
            color-mix(in srgb, var(--primary-500) 6%, transparent), transparent 70%);
        }

        .cp-content > *:not(.cp-bg) { position: relative; z-index: 1; }
        .cp-content > .cp-top { position: relative; z-index: 10; }

        /* topbar */
        .cp-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px; padding: 26px 40px; flex-shrink: 0;
        }

        .cp-count { font-size: 21px; color: var(--gray-300); font-weight: 500; }
        .cp-count b { color: var(--gray-100); font-weight: 700; }
        .cp-top-right { display: flex; align-items: center; gap: 16px; }

        /* view tabs */
        .cp-viewtabs {
          display: flex; gap: 4px; padding: 5px; border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-900) 50%, transparent);
        }

        .cp-viewtab {
          display: grid; place-items: center; width: 42px; height: 38px;
          border: 0; border-radius: 9px; background: none;
          color: var(--gray-400); cursor: pointer; transition: .16s; font-family: inherit;
        }

        .cp-viewtab:hover {
          color: var(--gray-200);
          background: color-mix(in srgb, var(--gray-300) 6%, transparent);
        }

        .cp-viewtab.on {
          color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 14%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-500) 30%, transparent);
        }

        /* search */
        .cp-search {
          display: flex; align-items: center; gap: 11px; width: 340px; height: 48px;
          padding: 0 18px; border-radius: 13px; cursor: text; flex-shrink: 0;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-900) 50%, transparent);
          color: var(--gray-500);
        }

        .cp-search input {
          flex: 1; min-width: 0; border: 0; background: none; outline: none;
          font-family: inherit; font-size: 15.5px; color: var(--gray-100);
        }

        .cp-search input::placeholder { color: var(--gray-500); }

        /* main */
        .cp-main {
          flex: 1; min-height: 0; padding: 0 40px 40px;
          display: flex; flex-direction: column; overflow: hidden;
        }

        /* cover */
        .cp-cover {
          flex: none; display: grid; place-items: center;
          width: 52px; height: 52px; border-radius: 14px; overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--gray-100) 6%, transparent);
        }

        .cp-cover-grad {
          background: radial-gradient(120% 120% at 30% 20%, var(--primary-700), var(--primary-900));
        }

        .cp-cover-grad span {
          font-size: 21px; font-weight: 700; color: var(--primary-200); letter-spacing: -0.02em;
        }

        /* status badge */
        .cp-status {
          display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px;
          border-radius: 999px; font-size: 13.5px; font-weight: 600; white-space: nowrap;
        }

        .cp-status.doing {
          color: var(--primary-200);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 28%, transparent);
        }

        .cp-status.done {
          color: var(--gray-300);
          background: color-mix(in srgb, var(--gray-300) 7%, transparent);
          border: 1px solid var(--gray-700);
        }

        .cp-status-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: block;
        }

        .cp-status.doing .cp-status-dot {
          background: var(--primary-400);
          box-shadow: 0 0 8px rgba(30,182,232,0.8);
        }

        .cp-status.done .cp-status-dot { background: var(--gray-500); }

        /* progress */
        .cp-prog { display: flex; flex-direction: column; gap: 8px; width: 100%; }

        .cp-prog-head {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; color: var(--gray-400);
        }

        .cp-prog-pct { color: var(--gray-200); font-weight: 600; }

        .cp-prog-track {
          height: 7px; border-radius: 999px; overflow: hidden;
          background: var(--primary-900); border: 1px solid var(--gray-700);
        }

        .cp-prog-fill {
          display: block; height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
        }

        /* ---- LIST ---- */
        .cp-table {
          border: 1px solid var(--gray-700); border-radius: 20px; overflow: hidden;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-700) 16%, transparent),
            color-mix(in srgb, var(--primary-800) 28%, transparent)
          );
          display: flex; flex-direction: column; flex: 1; min-height: 0;
        }

        .cp-thead {
          display: grid; grid-template-columns: 2.4fr 1.3fr 1.6fr 1fr; gap: 24px;
          padding: 20px 28px; border-bottom: 1px solid var(--gray-700);
          font-size: 14px; font-weight: 600; color: var(--gray-400); flex-shrink: 0;
        }

        .cp-th-right { text-align: right; }

        .cp-rows { display: flex; flex-direction: column; flex: 1; overflow-y: auto; }

        .cp-row {
          display: grid; grid-template-columns: 2.4fr 1.3fr 1.6fr 1fr;
          gap: 24px; align-items: center; padding: 20px 28px;
          border-bottom: 1px solid color-mix(in srgb, var(--gray-700) 55%, transparent);
          transition: .16s; cursor: pointer;
        }

        .cp-row:last-child { border-bottom: 0; }

        .cp-row:hover {
          background: color-mix(in srgb, var(--primary-500) 4%, transparent);
        }

        .cp-row-proj { display: flex; align-items: center; gap: 16px; min-width: 0; }

        .cp-row-name {
          font-size: 17px; font-weight: 600; color: var(--gray-100);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .cp-row-due {
          text-align: right; font-size: 15px; font-weight: 500; color: var(--gray-200);
        }

        /* ---- BOARD ---- */
        .cp-board {
          display: grid; grid-template-columns: 1fr 1fr; gap: 36px;
          flex: 1; min-height: 0; overflow-y: auto;
        }

        .cp-col { display: flex; flex-direction: column; gap: 20px; }

        .cp-col:first-child {
          border-right: 1px solid var(--gray-700);
          padding-right: 36px;
        }

        .cp-col-head { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

        .cp-col-pill { padding: 7px 16px; border-radius: 999px; font-size: 14px; font-weight: 600; }

        .cp-col-pill.doing {
          color: var(--primary-200);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 28%, transparent);
        }

        .cp-col-pill.done {
          color: var(--gray-300);
          background: color-mix(in srgb, var(--gray-300) 7%, transparent);
          border: 1px solid var(--gray-700);
        }

        .cp-col-count { font-size: 16px; font-weight: 600; color: var(--gray-400); }

        .cp-col-cards { display: flex; flex-direction: column; gap: 22px; }

        .cp-col-empty {
          padding: 28px 4px; font-size: 15px; font-style: italic;
          color: var(--gray-500); margin: 0;
        }

        .cp-card {
          border: 1px solid var(--gray-700); border-radius: 18px; overflow: hidden;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-600) 16%, transparent),
            color-mix(in srgb, var(--primary-800) 30%, transparent)
          );
          transition: .18s; flex-shrink: 0;
        }

        .cp-card:hover { border-color: var(--gray-600); transform: translateY(-2px); }

        .cp-card-cover {
          width: 100%; height: 150px; position: relative;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
          border-bottom: 1px solid color-mix(in srgb, var(--gray-100) 5%, transparent);
          background: radial-gradient(120% 120% at 30% 20%, var(--primary-700), var(--primary-900));
          flex-shrink: 0;
        }

        .cp-card-cover-letter {
          font-size: 40px; font-weight: 700; letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--primary-100) 50%, transparent);
        }

        .cp-card-body {
          display: flex; flex-direction: column; gap: 16px; padding: 22px 24px 24px;
        }

        .cp-card-name {
          margin: 0; font-size: 20px; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
        }

        .cp-card-due { margin: 0; font-size: 14px; color: var(--gray-400); }

        .cp-card-btn {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          height: 50px; margin-top: 2px; font-family: inherit; font-size: 15.5px; font-weight: 600;
          color: var(--primary-200); cursor: pointer; border-radius: 13px; width: 100%;
          border: 1px solid color-mix(in srgb, var(--primary-500) 28%, transparent);
          background: color-mix(in srgb, var(--primary-500) 7%, transparent);
          transition: .18s;
        }

        .cp-card-btn:hover {
          background: color-mix(in srgb, var(--primary-500) 14%, transparent);
          border-color: var(--primary-500);
        }

        /* ---- CALENDAR ---- */
        .cp-cal {
          display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;
          border: 1px solid var(--gray-700); border-radius: 20px; padding: 26px 30px 20px;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-700) 14%, transparent),
            color-mix(in srgb, var(--primary-800) 26%, transparent)
          );
        }

        .cp-cal-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 22px; flex-shrink: 0;
        }

        .cp-cal-title {
          margin: 0; font-size: 24px; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
        }

        .cp-cal-nav {
          display: grid; place-items: center; width: 42px; height: 42px;
          border-radius: 11px; border: 1px solid var(--gray-700); font-family: inherit;
          background: color-mix(in srgb, var(--primary-900) 40%, transparent);
          color: var(--gray-300); cursor: pointer; transition: .16s;
        }

        .cp-cal-nav:hover { border-color: var(--primary-500); color: var(--primary-300); }

        .cp-cal-weekdays {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 10px; margin-bottom: 12px; flex-shrink: 0;
        }

        .cp-cal-weekday {
          text-align: center; font-size: 13.5px; font-weight: 600; color: var(--gray-400);
        }

        .cp-cal-grid {
          flex: 1; min-height: 0;
          display: grid; grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(70px, 1fr); gap: 10px; overflow-y: auto;
        }

        .cp-cal-cell {
          display: flex; flex-direction: column; gap: 6px; padding: 12px;
          border-radius: 13px; border: 1px solid transparent;
          background: color-mix(in srgb, var(--primary-900) 35%, transparent);
        }

        .cp-cal-cell.empty { background: transparent; border-color: transparent; }

        .cp-cal-cell.today {
          border-color: var(--primary-500);
          background: color-mix(in srgb, var(--primary-500) 7%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-500) 20%, transparent);
        }

        .cp-cal-day { font-size: 17px; font-weight: 700; color: var(--gray-200); }

        .cp-cal-cell.today .cp-cal-day { color: var(--primary-300); }

        .cp-cal-chip {
          align-self: flex-start; padding: 5px 11px; border-radius: 8px;
          font-size: 12.5px; font-weight: 600; color: var(--primary-100);
          background: color-mix(in srgb, var(--primary-500) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 30%, transparent);
          max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          cursor: pointer; transition: .15s;
        }

        .cp-cal-chip:hover {
          background: color-mix(in srgb, var(--primary-500) 22%, transparent);
        }

        /* empty state */
        .cp-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 16px; padding: 40px 20px; text-align: center; flex: 1;
        }

        .cp-empty-ico {
          display: grid; place-items: center; width: 60px; height: 60px;
          border-radius: 50%; color: var(--gray-500);
          background: color-mix(in srgb, var(--gray-300) 6%, transparent);
          border: 1px solid var(--gray-700);
        }

        /* scrollbars */
        .cp-rows::-webkit-scrollbar,
        .cp-board::-webkit-scrollbar,
        .cp-cal-grid::-webkit-scrollbar { width: 5px; }

        .cp-rows::-webkit-scrollbar-track,
        .cp-board::-webkit-scrollbar-track,
        .cp-cal-grid::-webkit-scrollbar-track { background: transparent; }

        .cp-rows::-webkit-scrollbar-thumb,
        .cp-board::-webkit-scrollbar-thumb,
        .cp-cal-grid::-webkit-scrollbar-thumb { background: var(--gray-700); border-radius: 9999px; }

        .cp-rows::-webkit-scrollbar-thumb:hover,
        .cp-board::-webkit-scrollbar-thumb:hover,
        .cp-cal-grid::-webkit-scrollbar-thumb:hover { background: var(--gray-600); }
      `}</style>
    </div>
  );
}
