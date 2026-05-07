"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateTask, deleteTask } from "@/lib/supabaseQueries/tasks";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/Skeleton";
import { jsonToPlainText, calcularUrgencia, formatarDataCurta, tempoRelativo } from "@/lib/utils";
import UrgenciaIndicator from "@/components/UrgenciaIndicator";

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
  { id: "Sem prioridade", title: "Nenhuma", iconColor: "text-slate-400" },
  { id: "Baixa", title: "Baixa", iconColor: "text-emerald-400" },
  { id: "Normal", title: "Média", iconColor: "text-sky-400" },
  { id: "Urgente", title: "Alta", iconColor: "text-amber-400" },
  { id: "Muito urgente", title: "Urgente", iconColor: "text-rose-400" },
];

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
      case "Muito urgente":
        return addDays(1);
      case "Urgente":
        return addDays(2);
      case "Normal":
        return addDays(5);
      case "Baixa":
        return addDays(14);
      case "Sem prioridade":
      default:
        return null;
    }
  }

  async function handleTaskDrop(taskId: string, targetUrgency: string) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const currentUrgency = calcularUrgencia(task.due_date);
      if (currentUrgency === targetUrgency) return;

      const newDueDate = getDateForUrgency(targetUrgency);
      
      setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
              return { ...t, due_date: newDueDate };
          }
          return t;
      }));

      try {
        await updateTask(taskId, { due_date: newDueDate });
      } catch (error) {
          console.error("Erro ao atualizar data da tarefa:", error);
           setTasks(prev => prev.map(t => {
              if (t.id === taskId) {
                  return { ...t, due_date: task.due_date };
              }
              return t;
          }));
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

  useEffect(() => {
    carregarDados();
  }, [authUser]);

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
        setSubtasksByTask((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
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
      return {
        ...prev,
        [subtask.task_id]: lista.map((st) => (st.id === subtask.id ? { ...st, concluida: novaSituacao } : st)),
      };
    });
  }, []);

  const urgencyByTask = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tasks) {
      map[t.id] = calcularUrgencia(t.due_date);
    }
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

  const renderViewToggle = () => (
    <div className="flex bg-primary-800 rounded-lg p-1 border border-primary-700">
      <button
        onClick={() => changeView("list")}
        className={`p-2 rounded-md transition-all ${
          view === "list" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
        }`}
        title="Visualização em Lista"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      <button
        onClick={() => changeView("boards")}
        className={`p-2 rounded-md transition-all ${
          view === "boards" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
        }`}
        title="Visualização em Quadros"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      </button>

      <button
        onClick={() => changeView("calendar")}
        className={`p-2 rounded-md transition-all ${
          view === "calendar" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
        }`}
        title="Visualização em Calendário"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    </div>
  );

  return (
    <>

      <div className="flex flex-col flex-1 gap-4 pr-6 py-4 overflow-hidden">
        <header className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 border border-primary-700 text-gray-300 rounded-lg hover:bg-primary-800 transition-colors"
              type="button"
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
              <h1 className="text-[28px] md:text-[32px] text-gray-100 font-semibold leading-[1.2]">Tarefas</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {renderViewToggle()}
            <button
              onClick={() => router.push("/dashboard/tarefas/nova")}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg px-6 py-3 text-[15px] flex items-center gap-2"
              type="button"
            >
              + Nova tarefa
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">


          <div className="flex-1" />

          {view === "list" && (
            <>
              <div className="relative">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-[13px] text-gray-100 appearance-none"
                >
                  <option value="">Todos os status</option>
                  <option value="para_fazer">Para fazer</option>
                  <option value="concluida">Concluída</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">▼</span>
              </div>

              <div className="relative">
                <select
                  value={filtroUrgencia}
                  onChange={(e) => setFiltroUrgencia(e.target.value)}
                  className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-[13px] text-gray-100 appearance-none"
                >
                  <option value="">Todas as urgências</option>
                  <option value="Muito urgente">Muito urgente</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Normal">Normal</option>
                  <option value="Baixa">Baixa</option>
                  <option value="Sem prioridade">Sem prioridade</option>
                  <option value="Vencida">Vencida</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">▼</span>
              </div>
            </>
          )}
        </div>

        {view === "list" && (
          <section className="flex-1 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden flex flex-col h-full min-h-0">
            <div className="px-6 py-3 border-b border-primary-700 text-[13px] text-gray-400 flex items-center gap-4">
              <div className="w-[52px]" />
              <div className="flex-1 min-w-[200px]">Tarefa</div>
              <div className="w-[180px] hidden md:block">Projeto</div>
              <div className="w-[160px] hidden md:block">Urgência</div>
              <div className="w-[120px] hidden md:block">Vencimento</div>
              <div className="w-[120px] hidden md:block">Criação</div>
              <div className="w-[40px]" />
            </div>

            <div className="flex-1 overflow-y-auto tasks-scroll">
              {loading ? (
                <SkeletonList rows={7} cols={5} />
              ) : tasksFiltradas.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-sm">Nenhuma tarefa encontrada com os filtros atuais.</div>
              ) : (
                <div className="divide-y divide-primary-800">
                  {tasksFiltradas.map((t) => {
                    const urgencia = urgencyByTask[t.id] ?? "Sem prioridade";
                    const ehConcluida = t.status === "concluida";
                    const preview = jsonToPlainText(t.descricao).slice(0, 140);
                    const subtasks = subtasksByTask[t.id] || [];
                    const hasSubtasks = subtasks.length > 0;

                    return (
                      <div key={t.id} className="px-6">
                        <div onClick={() => abrirDetalhes(t.id)} className="py-5 cursor-pointer transition-colors hover:bg-primary-800/70 group -mx-6 px-6">
                          <div className="grid grid-cols-1 md:grid-cols-[52px,1fr,180px,160px,120px,120px,40px] gap-4 items-start">
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alternarStatus(t);
                                }}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all ${
                                  ehConcluida
                                    ? "border-emerald-400 bg-emerald-400/10"
                                    : "border-primary-700 bg-primary-900 group-hover:border-primary-500"
                                }`}
                              >
                                {ehConcluida ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.4}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="5 13 10 18 19 7" />
                                  </svg>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-gray-600" />
                                )}
                              </button>
                            </div>

                            <div className="min-w-0">
                              <div className="min-w-0">
                                <div className={`text-[16px] md:text-[17px] ${ehConcluida ? "text-gray-400 line-through" : "text-gray-100"}`}>{t.titulo}</div>

                                {preview && <div className="mt-1 text-[13px] text-gray-400 line-clamp-1">{preview}</div>}

                                {hasSubtasks && (
                                  <div className="mt-3">
                                    <div className="pl-0 flex flex-col gap-3">
                                      {subtasks.map((st, idx) => (
                                        <div
                                          key={st.id}
                                          draggable
                                          onDragStart={(e) => {
                                            e.stopPropagation();
                                            setDragSub({ taskId: t.id, fromIndex: idx, subId: st.id });
                                            try {
                                              e.dataTransfer.effectAllowed = "move";
                                              e.dataTransfer.setData("text/plain", st.id);
                                            } catch {}
                                          }}
                                          onDragEnd={(e) => {
                                            e.stopPropagation();
                                            setDragSub(null);
                                          }}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!dragSub) return;
                                            if (dragSub.taskId !== t.id) return;
                                            if (dragSub.fromIndex === idx) return;
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!dragSub) return;
                                            if (dragSub.taskId !== t.id) return;
                                            reorderSubtasks(t.id, dragSub.fromIndex, idx);
                                            setDragSub({ taskId: t.id, fromIndex: idx, subId: dragSub.subId });
                                          }}
                                          className="flex items-center gap-2"
                                        >
                                          <div className="w-5 flex items-center justify-center text-gray-500 select-none cursor-grab">⋮⋮</div>

                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await alternarSubtask(st);
                                            }}
                                            className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all ${
                                              st.concluida
                                                ? "border-emerald-400 bg-emerald-400/10"
                                                : "border-primary-700 bg-primary-900 hover:border-primary-500"
                                            }`}
                                          >
                                            {st.concluida ? (
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-4 h-4"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2.4}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <polyline points="5 13 10 18 19 7" />
                                              </svg>
                                            ) : (
                                              <div className="w-4 h-4 rounded-full border border-gray-600" />
                                            )}
                                          </button>

                                          <span className={st.concluida ? "text-gray-500 line-through" : "text-gray-200"}>{st.titulo}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="hidden md:block pt-0.5">
                              <div className="inline-flex items-center px-3 py-1 rounded-lg bg-primary-800 border border-primary-600 text-[12px] text-gray-100">
                                <span className="truncate max-w-[140px]">{projetoNome(t.projeto_id)}</span>
                              </div>
                            </div>

                            <div className="hidden md:flex items-center gap-2 pt-0.5">
                              <UrgenciaIndicator nivel={urgencia} />
                              <span className="text-[12px] text-gray-300">{urgencia}</span>
                            </div>

                            <div className="hidden md:block pt-0.5">
                              <span className="text-[13px] text-gray-100">{formatarDataCurta(t.due_date)}</span>
                            </div>

                            <div className="hidden md:block pt-0.5">
                              <span className="text-[13px] text-gray-400">{tempoRelativo(t.created_at)}</span>
                            </div>

                            <div className="flex justify-end pt-0.5">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId((current) => (current === t.id ? null : t.id));
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

                                {openMenuId === t.id && (
                                  <div className="absolute right-0 mt-2 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl z-20" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        editarTarefa(t.id);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 rounded-t-xl"
                                    >
                                      Editar
                                    </button>

                                    <button
                                      onClick={async () => {
                                        setOpenMenuId(null);
                                        await excluirTask(t.id);
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {view === "boards" && (
          <div className="flex-1 flex flex-col overflow-y-auto tasks-scroll">
            <div className="flex w-full px-4 gap-4 min-h-full">
              {URGENCY_COLUMNS.map((col, idx) => {
                const colTasks = tasksFiltradas.filter((t) => {
                    const urg = urgencyByTask[t.id] === "Vencida" ? "Muito urgente" : (urgencyByTask[t.id] ?? "Sem prioridade");
                    return urg === col.id;
                });

                return (
                  <div 
                    key={col.id} 
                    className="flex-1 min-w-0 flex flex-col gap-4 px-2"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData("application/x-task-id");
                      if (taskId) {
                         handleTaskDrop(taskId, col.id);
                      }
                    }}
                  >
                     <div className="flex items-center justify-start mb-2 sticky top-0 z-10 bg-primary-900/95 backdrop-blur-sm pt-1 pb-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-800/10 backdrop-blur-sm">
                        <UrgenciaIndicator nivel={col.id === 'Sem prioridade' ? 'Sem prioridade' : col.id} />
                        <span className={`text-[12px] font-medium ${col.iconColor}`}>{col.title}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pb-4">
                      {colTasks.map((t) => {
                        const subtasks = subtasksByTask[t.id] || [];
                        const completedSubtasks = subtasks.filter((s) => s.concluida).length;

                        return (
                          <div
                            key={t.id}
                            onClick={() => abrirDetalhes(t.id)}
                            className="bg-primary-800 hover:bg-primary-700 border-none rounded-xl p-4 cursor-pointer transition-all hover:translate-y-[-2px] flex flex-col gap-2 group relative overflow-hidden"
                            draggable
                            onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("application/x-task-id", t.id);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${t.status === 'concluida' ? 'border-emerald-500' : 'border-gray-500'}`}>
                                {t.status === 'concluida' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] text-gray-200 font-medium leading-snug mb-1 line-clamp-2">{t.titulo}</div>
                              </div>
                            </div>
                            
                            <div className="mt-auto flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 rounded text-[9px] font-medium bg-primary-800/60 text-primary-200 truncate max-w-full">
                                        {projetoNome(t.projeto_id)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-600 pt-2">
                                    {subtasks.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                        </svg>
                                        <span>{completedSubtasks}/{subtasks.length}</span>
                                    </div>
                                    ) : ( <span></span> )}
                                    
                                    {t.due_date && (
                                        <span className="group-hover:text-primary-300 transition-colors">
                                            {formatarDataCurta(t.due_date)}
                                        </span>
                                    )}
                                </div>
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
        )}

        {view === "calendar" && (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden h-full min-h-0">
            <div className="flex items-center justify-center gap-8 pt-2">
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

            <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-4 overflow-y-auto tasks-scroll px-1 pb-2">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />;

                const dateStr = date.toISOString().split("T")[0];
                const daysTasks = tasksFiltradas.filter((t) => t.due_date === dateStr);
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div
                    key={dateStr}
                    className={`flex flex-col gap-2 p-3 rounded-2xl transition-all border ${
                      isToday
                        ? "bg-primary-800/10 border-primary-500"
                        : "bg-primary-800/20 border-transparent hover:bg-primary-800/40"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-lg font-bold ${isToday ? "text-primary-500" : "text-gray-100"}`}>
                        {date.getDate()}
                      </span>
                      {daysTasks.length > 0 && (
                        <span className="text-[10px] text-gray-500 font-medium">{daysTasks.length}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto tasks-scroll">
                      {daysTasks.map((t) => {
                        const urgencia = urgencyByTask[t.id] ?? "Sem prioridade";
                        return (
                          <div
                            key={t.id}
                            onClick={() => abrirDetalhes(t.id)}
                            className="group flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg bg-primary-800 hover:bg-primary-700 transition-all shadow-sm min-w-0"
                            title={t.titulo}
                          >
                            <span className={`text-[11px] font-medium truncate flex-1 ${t.status === 'concluida' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                              {t.titulo}
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
        )}

        <style jsx global>{`
          .tasks-scroll::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .tasks-scroll::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.9);
          }
          .tasks-scroll::-webkit-scrollbar-thumb {
            background: var(--primary-500);
            border-radius: 999px;
            border: 2px solid rgba(15, 23, 42, 0.9);
          }
          .tasks-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--primary-400);
          }
          .tasks-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-500) rgba(15, 23, 42, 0.9);
          }
        `}</style>
      </div>
    </>
  );
}