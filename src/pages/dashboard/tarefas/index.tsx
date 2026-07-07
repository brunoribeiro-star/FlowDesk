"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateTask, deleteTask } from "@/lib/supabaseQueries/tasks";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/Skeleton";
import { jsonToPlainText, calcularUrgencia, formatarDataCurta, tempoRelativo } from "@/lib/utils";
import UrgenciaIndicator from "@/components/UrgenciaIndicator";
import HeaderProfile from "@/components/HeaderProfile";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";
import { useIsMobile } from "@/hooks/useIsMobile";

const TAREFAS_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo às Tarefas!", content: "Esta é a visão global de todas as suas tarefas de todos os projetos. Ideal para saber o que precisa ser feito hoje, independente do projeto." },
  { target: "#tour-add-btn", placement: "bottom", skipBeacon: true, title: "Criar tarefa avulsa", content: "Crie uma tarefa rapidamente e associe-a a um projeto existente. Você também pode criar tarefas diretamente dentro de cada projeto." },
  { target: "body", placement: "center", skipBeacon: true, title: "Status e prazos", content: "Cada tarefa tem status (Para Fazer, Em Andamento, Concluída) e pode ter um prazo. Tarefas próximas do vencimento aparecem destacadas no painel principal." },
  { target: "body", placement: "center", skipBeacon: true, title: "Dica: subtarefas", content: "Dentro de cada tarefa você pode criar subtarefas para dividir o trabalho em etapas menores. Isso facilita o acompanhamento do progresso." },
];

interface Projeto {
  id: string;
  titulo: string;
}

interface Task {
  id: string;
  titulo: string;
  descricao: any;
  projeto_id: string | null;
  user_id: string | null;
  status: "para_fazer" | "em_andamento" | "concluida" | string;
  due_date: string | null;
  created_at: string;
}

interface Subtask {
  id: string;
  task_id: string;
  titulo: string;
  concluida: boolean | null;
}

const URGENCY_COLUMNS = [
  { id: "Sem prioridade", title: "Nenhuma", iconColor: "var(--gray-400)" },
  { id: "Baixa", title: "Baixa", iconColor: "var(--primary-300)" },
  { id: "Normal", title: "Média", iconColor: "var(--primary-400)" },
  { id: "Urgente", title: "Alta", iconColor: "var(--alert-medium)" },
  { id: "Muito urgente", title: "Urgente", iconColor: "var(--error-medium)" },
];

const IconList = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>
    <path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/>
  </svg>
);
const IconBoard = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/>
    <rect x="3" y="15" width="7" height="5" rx="1.5"/><rect x="14" y="15" width="7" height="5" rx="1.5"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>
  </svg>
);
const IconChevLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);
const IconChevRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
const IconChevDown = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const IconPlus = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"/><path d="M5 12h14"/>
  </svg>
);
const IconCheck = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5 9-10"/>
  </svg>
);
const IconDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
  </svg>
);
const IconGrip = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>
  </svg>
);
const IconChecklist = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 6 2 2 3-3"/><path d="m3 14 2 2 3-3"/><path d="M12 6h9"/><path d="M12 14h9"/>
  </svg>
);

export default function TarefasPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUrgencia, setFiltroUrgencia] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>({});
  const [dragSub, setDragSub] = useState<{ taskId: string; fromIndex: number; subId: string } | null>(null);

  const taskIdsRef = useRef<Set<string>>(new Set());
  const collabProjectIdsRef = useRef<Set<string>>(new Set());

  const [view, setView] = useState<"list" | "boards" | "calendar">("list");
  const isMobile = useIsMobile();
  // Board and calendar layouts need more horizontal room than a phone screen
  // offers, so mobile always falls back to the stacked list view.
  const effectiveView: "list" | "boards" | "calendar" = isMobile ? "list" : view;

  useEffect(() => {
    const savedView = localStorage.getItem("tarefasViewMode");
    if (savedView && ["list", "boards", "calendar"].includes(savedView)) {
      setView(savedView as any);
    }
  }, []);

  const changeView = (newView: "list" | "boards" | "calendar") => {
    setView(newView);
    localStorage.setItem("tarefasViewMode", newView);
  };
  const [currentDate, setCurrentDate] = useState(new Date());

  const [dragTask, setDragTask] = useState<{ id: string; fromStatus: string } | null>(null);

  function getDateForUrgency(urgency: string): string | null {
    const today = new Date();
    const addDays = (days: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      return d.toISOString().split("T")[0];
    };

    switch (urgency) {
      case "Muito urgente": return addDays(1);
      case "Urgente": return addDays(2);
      case "Normal": return addDays(5);
      case "Baixa": return addDays(14);
      case "Sem prioridade":
      default: return null;
    }
  }

  async function handleTaskDrop(taskId: string, targetUrgency: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentUrgency = calcularUrgencia(task.due_date);
    if (currentUrgency === targetUrgency) return;
    const newDueDate = getDateForUrgency(targetUrgency);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDueDate } : t));
    try {
      await updateTask(taskId, { due_date: newDueDate });
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: task.due_date } : t));
    }
  }

  const { user: authUser } = useAuth();

  async function carregarDados() {
    if (!authUser) return;
    setLoading(true);

    const user = authUser;

    const [{ data: tasksData, error: tasksError }, { data: projetosData, error: projetosError }, { data: subtasksData }, { data: membersData }] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("projetos").select("id, titulo").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("subtasks").select("id, task_id, titulo, concluida").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("project_members").select("project_id").eq("user_id", user.id),
    ]);

    if (tasksError || projetosError) {
      setTasks([]);
      setProjetos([]);
      setSubtasksByTask({});
      setLoading(false);
      return;
    }

    const ownedIds = new Set((projetosData || []).map((p: any) => p.id));
    const collabProjectIds = (membersData || []).map((m: any) => m.project_id).filter((id: string) => !ownedIds.has(id));
    collabProjectIdsRef.current = new Set(collabProjectIds);

    const ownedTasks = (tasksData || []) as Task[];
    const ownedProjetos = (projetosData || []) as Projeto[];

    function buildSubtaskMap(subs: any[]): Record<string, Subtask[]> {
      const map: Record<string, Subtask[]> = {};
      subs.forEach((st: any) => {
        if (!st?.task_id) return;
        const key = String(st.task_id);
        if (!map[key]) map[key] = [];
        map[key].push({ id: String(st.id), task_id: String(st.task_id), titulo: String(st.titulo || ""), concluida: st.concluida ?? null });
      });
      return map;
    }

    setTasks(ownedTasks);
    setProjetos(ownedProjetos);
    setSubtasksByTask(buildSubtaskMap(subtasksData || []));
    setLoading(false);

    if (collabProjectIds.length > 0) {
      Promise.all([
        supabase.from("tasks").select("*").in("projeto_id", collabProjectIds).order("created_at", { ascending: false }),
        supabase.from("projetos").select("id, titulo").in("id", collabProjectIds),
      ]).then(([{ data: collabTasks }, { data: collabProjetos }]) => {
        const newTasks: Task[] = [];
        const existingIds = new Set(ownedTasks.map(t => t.id));
        (collabTasks || []).forEach((t: any) => { if (!existingIds.has(t.id)) newTasks.push(t as Task); });

        const newProjetos: Projeto[] = [];
        const projExistingIds = new Set(ownedProjetos.map(p => p.id));
        (collabProjetos || []).forEach((p: any) => { if (!projExistingIds.has(p.id)) newProjetos.push(p as Projeto); });

        if (newTasks.length > 0 || newProjetos.length > 0) {
          collabProjectIdsRef.current = new Set(collabProjectIds);
          setTasks(prev => [...prev, ...newTasks]);
          setProjetos(prev => [...prev, ...newProjetos]);

          const collabTaskIds = newTasks.map(t => t.id);
          if (collabTaskIds.length > 0) {
            supabase.from("subtasks").select("id, task_id, titulo, concluida").in("task_id", collabTaskIds).order("created_at", { ascending: true })
              .then(({ data: collabSubtasks }) => {
                if (collabSubtasks && collabSubtasks.length > 0) {
                  setSubtasksByTask(prev => {
                    const next = { ...prev };
                    (collabSubtasks as any[]).forEach((st: any) => {
                      if (!st?.task_id) return;
                      const key = String(st.task_id);
                      if (!next[key]) next[key] = [];
                      next[key].push({ id: String(st.id), task_id: String(st.task_id), titulo: String(st.titulo || ""), concluida: st.concluida ?? null });
                    });
                    return next;
                  });
                }
              });
          }
        }
      });
    }
  }

  useEffect(() => { carregarDados(); }, [authUser]);

  useEffect(() => {
    taskIdsRef.current = new Set(tasks.map((t) => t.id));
  }, [tasks]);

  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel("tarefas-realtime")
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "tasks" }, (payload: any) => {
        const t = payload.new as Task;
        const isOwned = t.user_id === authUser.id;
        const isCollab = t.projeto_id ? collabProjectIdsRef.current.has(t.projeto_id) : false;
        if (!isOwned && !isCollab) return;
        setTasks((prev) => {
          if (prev.some((x) => x.id === t.id)) return prev;
          return [t, ...prev];
        });
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "tasks" }, (payload: any) => {
        const t = payload.new as Task;
        if (!taskIdsRef.current.has(t.id)) return;
        setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...t } : x)));
      })
      .on("postgres_changes" as any, { event: "DELETE", schema: "public", table: "tasks" }, (payload: any) => {
        const id = payload.old?.id;
        if (!id || !taskIdsRef.current.has(id)) return;
        setTasks((prev) => prev.filter((x) => x.id !== id));
        setSubtasksByTask((prev) => { const next = { ...prev }; delete next[id]; return next; });
      })
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "subtasks" }, (payload: any) => {
        const s = payload.new;
        if (!s?.task_id || !taskIdsRef.current.has(String(s.task_id))) return;
        const sub: Subtask = { id: String(s.id), task_id: String(s.task_id), titulo: String(s.titulo || ""), concluida: s.concluida ?? null };
        setSubtasksByTask((prev) => {
          const lista = prev[sub.task_id] || [];
          if (lista.some((x) => x.id === sub.id)) return prev;
          return { ...prev, [sub.task_id]: [...lista, sub] };
        });
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "subtasks" }, (payload: any) => {
        const s = payload.new;
        if (!s?.task_id || !taskIdsRef.current.has(String(s.task_id))) return;
        setSubtasksByTask((prev) => {
          const lista = prev[String(s.task_id)] || [];
          return { ...prev, [String(s.task_id)]: lista.map((x) => (x.id === String(s.id) ? { ...x, titulo: s.titulo, concluida: s.concluida } : x)) };
        });
      })
      .on("postgres_changes" as any, { event: "DELETE", schema: "public", table: "subtasks" }, (payload: any) => {
        const s = payload.old;
        if (!s?.task_id || !taskIdsRef.current.has(String(s.task_id))) return;
        setSubtasksByTask((prev) => {
          const lista = prev[String(s.task_id)] || [];
          return { ...prev, [String(s.task_id)]: lista.filter((x) => x.id !== String(s.id)) };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  const alternarStatus = useCallback(async (task: Task) => {
    const novoStatus = task.status === "concluida" ? "para_fazer" : "concluida";
    await updateTask(task.id, { status: novoStatus });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: novoStatus } : t)));
  }, []);

  const alternarSubtask = useCallback(async (subtask: Subtask) => {
    const novaSituacao = !subtask.concluida;
    await supabase.from("subtasks").update({ concluida: novaSituacao }).eq("id", subtask.id);
    setSubtasksByTask((prev) => {
      const lista = prev[subtask.task_id] || [];
      return { ...prev, [subtask.task_id]: lista.map((st) => (st.id === subtask.id ? { ...st, concluida: novaSituacao } : st)) };
    });
  }, []);

  const urgencyByTask = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tasks) { map[t.id] = calcularUrgencia(t.due_date); }
    return map;
  }, [tasks]);

  const tasksFiltradas = useMemo(() => {
    return tasks.filter((t) => {
      const urgencia = urgencyByTask[t.id];
      const condStatus =
        filtroStatus === "" ||
        (filtroStatus === "para_fazer" ? t.status !== "concluida" : t.status === "concluida");
      const condUrgencia = filtroUrgencia === "" || urgencia === filtroUrgencia;
      return condStatus && condUrgencia;
    });
  }, [tasks, filtroStatus, filtroUrgencia, urgencyByTask]);

  async function excluirTask(id: string) {
    if (!confirm("Excluir esta tarefa?")) return;
    await deleteTask(id);
    await carregarDados();
  }

  function projetoNome(id: string | null) {
    if (!id) return "Projeto";
    return projetos.find((p) => p.id === id)?.titulo || "Projeto";
  }

  const abrirDetalhes = useCallback((taskId: string) => {
    router.push(`/dashboard/tarefas/${taskId}`);
  }, [router]);

  const editarTarefa = useCallback((taskId: string) => {
    router.push(`/dashboard/tarefas/editar/${taskId}`);
  }, [router]);

  function reorderSubtasks(taskId: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setSubtasksByTask((prev) => {
      const list = [...(prev[taskId] || [])];
      if (!list.length) return prev;
      const item = list[fromIndex];
      if (!item) return prev;
      list.splice(fromIndex, 1);
      list.splice(toIndex, 0, item);
      return { ...prev, [taskId]: list };
    });
  }

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

  async function moveTaskToStatus(taskId: string, toStatus: string) {
    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status === toStatus) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: toStatus } : t)));
    const { error } = await supabase.from("tasks").update({ status: toStatus }).eq("id", taskId);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: current.status } : t)));
    }
  }

  return (
    <>
      <PageTour name="tarefas" steps={TAREFAS_TOUR_STEPS} />

      <div className="tk-page">
        <header className="tk-top-bar">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <div className="tk-top-left">
              <button type="button" onClick={() => router.push("/dashboard")} className="tk-back-btn">
                <IconChevLeft />
              </button>
              <h1 className="tk-page-title">Tarefas</h1>
            </div>
            <div className="lg:hidden">
              <HeaderProfile />
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 lg:contents">
            {!isMobile && (
              <div className="tk-seg-ctrl">
                {(["list","boards","calendar"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => changeView(k)}
                    className={"tk-seg-item" + (view === k ? " is-on" : "")}
                    title={k === "list" ? "Lista" : k === "boards" ? "Quadros" : "Calendário"}
                  >
                    {k === "list" ? <IconList /> : k === "boards" ? <IconBoard /> : <IconCalendar />}
                  </button>
                ))}
              </div>
            )}
            <button
              id="tour-add-btn"
              type="button"
              onClick={() => router.push("/dashboard/tarefas/nova")}
              className="tk-btn-primary flex-1 lg:flex-none"
            >
              <IconPlus /> Nova tarefa
            </button>
            <div className="hidden lg:block"><HeaderProfile /></div>
          </div>
        </header>

        {effectiveView === "list" && (
          <div className="tk-filters-row">
            <div className="tk-filter-wrap">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="tk-filter-select"
              >
                <option value="">Todos os status</option>
                <option value="para_fazer">Para fazer</option>
                <option value="concluida">Concluída</option>
              </select>
              <span className="tk-filter-chev"><IconChevDown /></span>
            </div>
            <div className="tk-filter-wrap">
              <select
                value={filtroUrgencia}
                onChange={(e) => setFiltroUrgencia(e.target.value)}
                className="tk-filter-select"
              >
                <option value="">Todas as urgências</option>
                <option value="Muito urgente">Muito urgente</option>
                <option value="Urgente">Urgente</option>
                <option value="Normal">Normal</option>
                <option value="Baixa">Baixa</option>
                <option value="Sem prioridade">Sem prioridade</option>
                <option value="Vencida">Vencida</option>
              </select>
              <span className="tk-filter-chev"><IconChevDown /></span>
            </div>
          </div>
        )}

        {effectiveView === "list" && (
          <section className="tlv-shell">
            <div className="tlv-head">
              <span>Tarefa</span>
              <span>Projeto</span>
              <span>Urgência</span>
              <span>Vencimento</span>
              <span>Criação</span>
              <span />
            </div>

            <div className="tlv-scroll tasks-scroll">
              {loading ? (
                <SkeletonList rows={7} cols={5} />
              ) : tasksFiltradas.length === 0 ? (
                <div className="tlv-empty">Nenhuma tarefa encontrada com os filtros atuais.</div>
              ) : (
                <div className="tlv-rows">
                  {tasksFiltradas.map((t) => {
                    const urgencia = urgencyByTask[t.id] ?? "Sem prioridade";
                    const ehConcluida = t.status === "concluida";
                    const subtasks = subtasksByTask[t.id] || [];
                    const total = subtasks.length;
                    const done = subtasks.filter(s => s.concluida).length;

                    return (
                      <div key={t.id} className="tlv-group">
                        <div className="tlv-row" onClick={() => abrirDetalhes(t.id)}>
                          <div className="tlv-task">
                            <button
                              type="button"
                              className={"tk-chk" + (ehConcluida ? " is-done" : "")}
                              onClick={(e) => { e.stopPropagation(); alternarStatus(t); }}
                            >
                              {ehConcluida && <IconCheck size={17} />}
                            </button>
                            <div className="tlv-task-main">
                              <div className="tlv-task-txt">
                                <span className={"tlv-name" + (ehConcluida ? " is-done" : "")}>{t.titulo}</span>
                                {total > 0 && (
                                  <span className="tlv-count">
                                    <IconChecklist /> {done}/{total}
                                  </span>
                                )}
                              </div>
                              <div className="md:hidden">
                                <div className="tlv-meta-mobile">
                                  <span className="tk-pill">{projetoNome(t.projeto_id)}</span>
                                  <span className="tlv-urg-mini"><UrgenciaIndicator nivel={urgencia} /> {urgencia}</span>
                                  <span className="tlv-due-mini">{formatarDataCurta(t.due_date)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:block">
                            <span className="tk-pill">{projetoNome(t.projeto_id)}</span>
                          </div>

                          <div className="hidden md:block">
                            <div className="tlv-urg-cell">
                              <UrgenciaIndicator nivel={urgencia} />
                              <span className="tlv-urg-label">{urgencia}</span>
                            </div>
                          </div>

                          <div className="tlv-due hidden md:block">{formatarDataCurta(t.due_date)}</div>

                          <div className="tlv-created hidden md:block">{tempoRelativo(t.created_at)}</div>

                          <div className="tlv-menu-wrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="tlv-more"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(cur => cur === t.id ? null : t.id);
                              }}
                            >
                              <IconDots />
                            </button>
                            {openMenuId === t.id && (
                              <div className="tlv-dropdown">
                                <button
                                  className="tlv-dd-item"
                                  onClick={() => { setOpenMenuId(null); editarTarefa(t.id); }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="tlv-dd-item danger"
                                  onClick={async () => { setOpenMenuId(null); await excluirTask(t.id); }}
                                >
                                  Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {total > 0 && (
                          <div className="tlv-subs">
                            {subtasks.map((st, idx) => (
                              <div
                                key={st.id}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  setDragSub({ taskId: t.id, fromIndex: idx, subId: st.id });
                                  try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", st.id); } catch {}
                                }}
                                onDragEnd={(e) => { e.stopPropagation(); setDragSub(null); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  if (!dragSub || dragSub.taskId !== t.id) return;
                                  reorderSubtasks(t.id, dragSub.fromIndex, idx);
                                  setDragSub({ taskId: t.id, fromIndex: idx, subId: dragSub.subId });
                                }}
                                className="tlv-sub"
                              >
                                <span className="tlv-grip"><IconGrip /></span>
                                <button
                                  type="button"
                                  className={"tk-chk sq" + (st.concluida ? " is-done" : "")}
                                  onClick={async (e) => { e.stopPropagation(); await alternarSubtask(st); }}
                                >
                                  {st.concluida && <IconCheck size={15} />}
                                </button>
                                <span className={"tlv-sub-title" + (st.concluida ? " is-done" : "")}>{st.titulo}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {effectiveView === "boards" && (
          <div className="tbv-shell tasks-scroll">
            {URGENCY_COLUMNS.map((col) => {
              const colTasks = tasksFiltradas.filter((t) => {
                const urg = urgencyByTask[t.id] === "Vencida" ? "Muito urgente" : (urgencyByTask[t.id] ?? "Sem prioridade");
                return urg === col.id;
              });

              return (
                <div
                  key={col.id}
                  className="tbv-col"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData("application/x-task-id");
                    if (taskId) handleTaskDrop(taskId, col.id);
                  }}
                >
                  <div className="tbv-col-head">
                    <div className="tbv-col-label">
                      <UrgenciaIndicator nivel={col.id} />
                      <span style={{ color: col.iconColor }} className="tbv-col-title">{col.title}</span>
                    </div>
                    <span className="tbv-col-count">{colTasks.length}</span>
                  </div>

                  <div className="tbv-cards tasks-scroll">
                    {colTasks.length === 0 ? (
                      <div className="tbv-empty">—</div>
                    ) : (
                      colTasks.map((t) => {
                        const subtasks = subtasksByTask[t.id] || [];
                        const completedSubs = subtasks.filter(s => s.concluida).length;
                        const ehConcluida = t.status === "concluida";

                        return (
                          <div
                            key={t.id}
                            className="tbv-card"
                            onClick={() => abrirDetalhes(t.id)}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("application/x-task-id", t.id);
                            }}
                          >
                            <div className="tbv-card-top">
                              <span className={"tk-chk" + (ehConcluida ? " is-done" : "")}>
                                {ehConcluida && <IconCheck size={17} />}
                              </span>
                              <h3 className={"tbv-card-title" + (ehConcluida ? " is-done" : "")}>{t.titulo}</h3>
                            </div>
                            <span className="tbv-card-proj">{projetoNome(t.projeto_id)}</span>
                            {(subtasks.length > 0 || t.due_date) && (
                              <div className="tbv-card-foot">
                                {subtasks.length > 0 ? (
                                  <span className="tbv-card-sub"><IconChecklist /> {completedSubs}/{subtasks.length}</span>
                                ) : <span />}
                                {t.due_date && <span className="tbv-card-due">{formatarDataCurta(t.due_date)}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {effectiveView === "calendar" && (
          <div className="tcv-shell">
            <div className="tcv-head">
              <button type="button" className="tcv-nav" onClick={prevMonth}><IconChevLeft /></button>
              <h2 className="tcv-title">
                {currentDate.toLocaleDateString("pt-BR", { month: "long" })}
                {" "}
                <span className="tcv-year">{currentDate.getFullYear()}</span>
              </h2>
              <button type="button" className="tcv-nav" onClick={nextMonth}><IconChevRight /></button>
            </div>

            <div className="tcv-scrollx tasks-scroll">
            <div className="tcv-weekdays">
              {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d) => (
                <span key={d} className="tcv-wd">{d}</span>
              ))}
            </div>

            <div className="tcv-grid tasks-scroll">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="tcv-cell is-blank" />;
                const dateStr = date.toISOString().split("T")[0];
                const daysTasks = tasksFiltradas.filter((t) => t.due_date === dateStr);
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div key={dateStr} className={"tcv-cell" + (isToday ? " is-today" : "")}>
                    <span className="tcv-day">{date.getDate()}</span>
                    {daysTasks.length > 0 && (
                      <span className="tcv-day-count">{daysTasks.length}</span>
                    )}
                    <div className="tcv-day-tasks tasks-scroll">
                      {daysTasks.map((t) => {
                        const urgencia = urgencyByTask[t.id] ?? "Sem prioridade";
                        return (
                          <div
                            key={t.id}
                            onClick={() => abrirDetalhes(t.id)}
                            className={"tcv-task-chip" + (t.status === "concluida" ? " is-done" : "")}
                            title={t.titulo}
                          >
                            <span className="tcv-chip-name">{t.titulo}</span>
                            <span className="tcv-chip-urg">
                              <UrgenciaIndicator nivel={urgencia} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* ===== PAGE WRAPPER ===== */
        .tk-page {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 0;
          padding: 12px 16px 16px;
          overflow: hidden;
          min-height: 0;
        }
        @media (min-width: 1024px) {
          .tk-page {
            padding-left: 0;
            padding-right: 24px;
            padding-top: 16px;
            padding-bottom: 16px;
          }
        }

        /* ===== HEADER ===== */
        .tk-top-bar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 0 0 16px 0;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--gray-700);
        }
        @media (min-width: 1024px) {
          .tk-top-bar {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 0 0 20px 0;
            margin-bottom: 20px;
          }
        }
        .tk-top-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tk-back-btn {
          display: grid;
          place-items: center;
          flex: none;
          width: 46px;
          height: 46px;
          border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-200);
          cursor: pointer;
          transition: .2s;
        }
        .tk-back-btn:hover {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }
        .tk-page-title {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          color: var(--gray-100);
          letter-spacing: -0.02em;
        }
        @media (min-width: 1024px) { .tk-page-title { font-size: 26px; } }
        .tk-top-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        /* ===== SEGMENTED VIEW TOGGLE ===== */
        .tk-seg-ctrl {
          display: flex;
          gap: 4px;
          padding: 5px;
          border-radius: 14px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
        }
        .tk-seg-item {
          display: grid;
          place-items: center;
          width: 46px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: none;
          color: var(--gray-400);
          cursor: pointer;
          transition: .15s;
        }
        .tk-seg-item:hover { color: var(--gray-200); }
        .tk-seg-item.is-on {
          background: var(--primary-700);
          color: var(--primary-300);
        }

        /* ===== PRIMARY BUTTON ===== */
        .tk-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 50px;
          padding: 0 24px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px var(--primary-500);
          transition: .2s;
        }
        .tk-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px -10px var(--primary-500);
        }

        /* ===== FILTERS ===== */
        .tk-filters-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-bottom: 14px;
        }
        @media (min-width: 640px) {
          .tk-filters-row { flex-direction: row; justify-content: flex-end; gap: 12px; padding-bottom: 16px; }
        }
        .tk-filter-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        @media (min-width: 640px) {
          .tk-filter-wrap { display: inline-flex; width: auto; }
        }
        .tk-filter-select {
          appearance: none;
          width: 100%;
          height: 44px;
          padding: 0 40px 0 18px;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 500;
          color: var(--gray-200);
          cursor: pointer;
          border-radius: 12px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          transition: .2s;
          outline: none;
        }
        .tk-filter-select:hover, .tk-filter-select:focus {
          border-color: var(--primary-600);
        }
        @media (min-width: 640px) {
          .tk-filter-select { width: auto; }
        }
        .tk-filter-chev {
          position: absolute;
          right: 14px;
          pointer-events: none;
          color: var(--gray-400);
          display: flex;
          align-items: center;
        }

        /* ===== LIST VIEW ===== */
        .tlv-shell {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          border-top: 1px solid var(--gray-800);
          overflow: hidden;
        }
        .tlv-head {
          display: none;
        }
        @media (min-width: 768px) {
          .tlv-head {
            display: grid;
            grid-template-columns: minmax(0,2.4fr) 1.5fr 1.2fr 0.9fr 0.9fr 44px;
            gap: 20px;
            padding: 14px 18px;
            flex-shrink: 0;
          }
        }
        .tlv-head span {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gray-400);
        }
        .tlv-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0 0 32px 0;
        }
        .tlv-rows {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tlv-empty {
          padding: 64px;
          text-align: center;
          color: var(--gray-500);
          font-size: 14px;
        }
        .tlv-group {
          border: 1px solid var(--gray-700);
          border-radius: 16px;
          background: var(--primary-800);
          overflow: hidden;
          transition: .2s;
        }
        .tlv-group:hover {
          border-color: var(--primary-600);
        }
        .tlv-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: background .15s;
        }
        @media (min-width: 768px) {
          .tlv-row {
            display: grid;
            grid-template-columns: minmax(0,2.4fr) 1.5fr 1.2fr 0.9fr 0.9fr 44px;
            align-items: center;
            gap: 20px;
            padding: 18px;
          }
        }
        .tlv-row:hover {
          background: var(--primary-700);
        }

        /* Checkbox */
        .tk-chk {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          flex: none;
          border-radius: 50%;
          border: 1.5px solid var(--gray-600);
          color: var(--primary-900);
          transition: .15s;
          background: none;
          cursor: pointer;
          flex-shrink: 0;
        }
        .tk-chk.sq {
          width: 22px;
          height: 22px;
          border-radius: 6px;
        }
        .tk-chk.is-done {
          background: var(--success-medium);
          border-color: transparent;
        }
        .tk-chk:not(.is-done):hover {
          border-color: var(--primary-400);
        }

        /* Task cell */
        .tlv-task {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1 1 auto;
        }
        .tlv-task-main {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }
        .tlv-task-txt {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .tlv-meta-mobile {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tlv-urg-mini {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: var(--gray-400);
        }
        .tlv-due-mini {
          font-size: 12.5px;
          color: var(--gray-500);
        }
        .tlv-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--gray-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tlv-name.is-done {
          color: var(--gray-500);
          text-decoration: line-through;
        }
        .tlv-count {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex: none;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--gray-400);
          padding: 3px 8px;
          border-radius: 8px;
          background: var(--primary-700);
        }

        /* Project pill */
        .tk-pill {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--primary-200);
          background: var(--primary-700);
          border: 1px solid var(--primary-600);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Urgency cell */
        .tlv-urg-cell {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .tlv-urg-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--gray-300);
        }

        /* Due / Created */
        .tlv-due {
          font-size: 14.5px;
          color: var(--gray-500);
        }
        .tlv-created {
          font-size: 14px;
          color: var(--gray-500);
        }

        /* Context menu */
        .tlv-menu-wrap {
          position: relative;
          display: flex;
          justify-content: center;
        }
        .tlv-more {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 9px;
          border: none;
          background: none;
          color: var(--gray-500);
          cursor: pointer;
          transition: .15s;
        }
        .tlv-more:hover {
          background: var(--primary-700);
          color: var(--gray-200);
        }
        .tlv-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          width: 148px;
          border-radius: 12px;
          background: var(--primary-800);
          border: 1px solid var(--gray-700);
          box-shadow: 0 16px 32px -8px var(--gray-900);
          z-index: 30;
          overflow: hidden;
        }
        .tlv-dd-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          font-size: 13.5px;
          color: var(--gray-100);
          background: none;
          border: none;
          cursor: pointer;
          transition: background .15s;
          font-family: inherit;
        }
        .tlv-dd-item:hover { background: var(--primary-700); }
        .tlv-dd-item.danger { color: var(--error-medium); }

        /* Subtasks */
        .tlv-subs {
          display: flex;
          flex-direction: column;
          padding: 4px 18px 14px 36px;
          border-top: 1px solid var(--gray-800);
        }
        .tlv-sub {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 0;
        }
        .tlv-grip {
          display: grid;
          place-items: center;
          color: var(--gray-600);
          cursor: grab;
          flex-shrink: 0;
        }
        .tlv-sub-title {
          font-size: 14.5px;
          color: var(--gray-200);
        }
        .tlv-sub-title.is-done {
          color: var(--gray-500);
          text-decoration: line-through;
        }

        /* ===== BOARD VIEW ===== */
        .tbv-shell {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(5, minmax(220px, 1fr));
          gap: 16px;
          padding-top: 8px;
          padding-bottom: 32px;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .tbv-col {
          display: flex;
          flex-direction: column;
          min-height: 0;
          min-width: 0;
        }
        .tbv-col-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 4px 14px;
          flex-shrink: 0;
        }
        .tbv-col-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tbv-col-title {
          font-size: 13.5px;
          font-weight: 600;
        }
        .tbv-col-count {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--gray-400);
          background: var(--primary-800);
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--gray-700);
        }
        .tbv-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          padding: 2px 2px 8px;
          flex: 1;
        }
        .tbv-empty {
          display: grid;
          place-items: center;
          height: 80px;
          border: 1px dashed var(--gray-700);
          border-radius: 14px;
          color: var(--gray-600);
          font-size: 20px;
        }
        .tbv-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          transition: .2s;
          cursor: pointer;
        }
        .tbv-card:hover {
          border-color: var(--primary-600);
          transform: translateY(-2px);
          box-shadow: 0 16px 38px -22px var(--gray-900);
        }
        .tbv-card-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .tbv-card-title {
          margin: 0;
          font-size: 15.5px;
          font-weight: 600;
          color: var(--gray-100);
          line-height: 1.35;
        }
        .tbv-card-title.is-done { color: var(--gray-400); }
        .tbv-card-proj {
          font-size: 13px;
          font-weight: 500;
          color: var(--primary-300);
          padding-left: 38px;
        }
        .tbv-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 0 0 38px;
          border-top: 1px solid var(--gray-800);
        }
        .tbv-card-sub {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-400);
        }
        .tbv-card-due {
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-400);
        }

        /* ===== CALENDAR VIEW ===== */
        .tcv-shell {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
          padding-top: 8px;
          overflow: hidden;
        }
        .tcv-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding-bottom: 20px;
          flex-shrink: 0;
        }
        .tcv-nav {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 11px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-300);
          cursor: pointer;
          transition: .2s;
        }
        .tcv-nav:hover {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }
        .tcv-title {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--gray-100);
          text-transform: capitalize;
        }
        .tcv-year { color: var(--primary-400); }
        .tcv-scrollx {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .tcv-weekdays {
          display: grid;
          grid-template-columns: repeat(7, minmax(96px, 1fr));
          gap: 10px;
          margin-bottom: 10px;
          flex-shrink: 0;
          min-width: 100%;
        }
        .tcv-wd {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--gray-400);
          text-align: center;
        }
        .tcv-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(7, minmax(96px, 1fr));
          auto-rows: 1fr;
          gap: 10px;
          overflow-y: auto;
          padding-bottom: 16px;
          min-width: 100%;
        }
        .tcv-cell {
          position: relative;
          border-radius: 14px;
          border: 1px solid var(--gray-800);
          background: var(--primary-800);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: .15s;
          min-height: 80px;
        }
        .tcv-cell:hover {
          border-color: var(--gray-600);
        }
        .tcv-cell.is-blank {
          border-color: transparent;
          background: none;
        }
        .tcv-cell.is-today {
          border-color: var(--primary-500);
          box-shadow: 0 0 0 1px var(--primary-500), 0 0 24px -8px var(--primary-500);
        }
        .tcv-day {
          font-size: 17px;
          font-weight: 700;
          color: var(--gray-100);
        }
        .tcv-cell.is-today .tcv-day { color: var(--primary-400); }
        .tcv-day-count {
          position: absolute;
          top: 10px;
          right: 12px;
          font-size: 11px;
          color: var(--gray-500);
          font-weight: 600;
        }
        .tcv-day-tasks {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          flex: 1;
        }
        .tcv-task-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          padding: 5px 8px;
          border-radius: 8px;
          background: var(--primary-700);
          cursor: pointer;
          transition: .15s;
          min-width: 0;
        }
        .tcv-task-chip:hover { background: var(--primary-600); }
        .tcv-task-chip.is-done .tcv-chip-name {
          text-decoration: line-through;
          color: var(--gray-500);
        }
        .tcv-chip-name {
          font-size: 11px;
          font-weight: 500;
          color: var(--gray-200);
          truncate: clip;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .tcv-chip-urg {
          flex-shrink: 0;
          transform: scale(0.75);
          transform-origin: right;
        }

        /* ===== SCROLLBAR ===== */
        .tasks-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .tasks-scroll::-webkit-scrollbar-track { background: transparent; }
        .tasks-scroll::-webkit-scrollbar-thumb {
          background: var(--gray-700);
          border-radius: 999px;
        }
        .tasks-scroll::-webkit-scrollbar-thumb:hover { background: var(--gray-600); }
        .tasks-scroll { scrollbar-width: thin; scrollbar-color: var(--gray-700) transparent; }
      `}</style>
    </>
  );
}
