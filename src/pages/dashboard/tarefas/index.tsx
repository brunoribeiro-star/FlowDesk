"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { updateTask, deleteTask } from "@/lib/supabaseQueries/tasks";
import { useRouter } from "next/navigation";

interface Projeto {
  id: string;
  titulo: string;
}

interface Task {
  id: string;
  titulo: string;
  descricao: any;
  projeto_id: string | null;
  status: "para_fazer" | "em_andamento" | "concluida" | string;
  due_date: string | null;
  created_at: string;
}

interface Subtask {
  id: string;
  task_id: string | null;
  titulo: string;
  concluida: boolean | null;
}

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

function calcularUrgencia(due_date: string | null): string {
  if (!due_date) return "Sem prioridade";
  const hoje = new Date();
  const limite = new Date(due_date + "T00:00:00");
  const diff = limite.getTime() - hoje.getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  if (dias < 0) return "Vencida";
  if (dias <= 1) return "Muito urgente";
  if (dias <= 2) return "Urgente";
  if (dias <= 7) return "Normal";
  return "Baixa";
}

function formatarDataCurta(dateStr: string | null) {
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

export default function TarefasPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUrgencia, setFiltroUrgencia] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  async function carregarDados() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      setTasks([]);
      setProjetos([]);
      setSubtasksByTask({});
      setLoading(false);
      return;
    }

    const [{ data: tasksData }, { data: projetosData }, { data: subtasksData }] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("projetos")
          .select("id, titulo")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("subtasks")
          .select("id, task_id, titulo, concluida")
          .eq("user_id", user.id),
      ]);

    setTasks((tasksData || []) as Task[]);
    setProjetos((projetosData || []) as Projeto[]);

    const map: Record<string, Subtask[]> = {};
    (subtasksData || []).forEach((st: any) => {
      if (!st.task_id) return;
      if (!map[st.task_id]) map[st.task_id] = [];
      map[st.task_id].push(st as Subtask);
    });
    setSubtasksByTask(map);

    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function alternarStatus(task: Task) {
    const novoStatus = task.status === "concluida" ? "para_fazer" : "concluida";

    await updateTask(task.id, { status: novoStatus });

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: novoStatus } : t))
    );
  }

  async function alternarSubtask(subtask: Subtask) {
    const novaSituacao = !subtask.concluida;

    await supabase
      .from("subtasks")
      .update({ concluida: novaSituacao })
      .eq("id", subtask.id);

    setSubtasksByTask((prev) => {
      const lista = prev[subtask.task_id || ""] || [];
      return {
        ...prev,
        [subtask.task_id || ""]: lista.map((st) =>
          st.id === subtask.id ? { ...st, concluida: novaSituacao } : st
        ),
      };
    });
  }

  const tasksFiltradas = tasks.filter((t) => {
    const urgencia = calcularUrgencia(t.due_date);

    const condStatus =
      filtroStatus === "" ||
      (filtroStatus === "para_fazer"
        ? t.status !== "concluida"
        : t.status === "concluida");

    const condUrgencia =
      filtroUrgencia === "" || urgencia === filtroUrgencia;

    return condStatus && condUrgencia;
  });

  async function excluirTask(id: string) {
    if (!confirm("Excluir esta tarefa?")) return;
    await deleteTask(id);
    await carregarDados();
  }

  function projetoNome(id: string | null) {
    if (!id) return "Projeto";
    return projetos.find((p) => p.id === id)?.titulo || "Projeto";
  }

  function abrirDetalhes(taskId: string) {
    router.push(`/dashboard/tarefas/${taskId}`);
  }

  function editarTarefa(taskId: string) {
    router.push(`/dashboard/tarefas/editar/${taskId}`);
  }

  function toggleExpand(taskId: string) {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 overflow-hidden">
        <header className="w-full flex items-center justify-between">
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
              <h1 className="text-[28px] md:text-[32px] text-gray-100 font-semibold leading-[1.2]">
                Tarefas
              </h1>
              <p className="text-[15px] md:text-[16px] text-gray-300 leading-[1.2]">
                Overview geral das tarefas dos seus projetos.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard/tarefas/nova")}
            className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg px-6 py-3 text-[15px]"
          >
            + Nova tarefa
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-500" />
            <span>
              {tasks.length === 0
                ? "Nenhuma tarefa cadastrada"
                : tasks.length === 1
                ? "1 tarefa cadastrada"
                : `${tasks.length} tarefas cadastradas`}
            </span>
          </div>

          <div className="flex-1" />

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

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
              ▼
            </span>
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

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
              ▼
            </span>
          </div>
        </div>

        <section className="flex-1 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
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
              <div className="py-16 text-center text-gray-400 text-sm">
                Carregando tarefas...
              </div>
            ) : tasksFiltradas.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                Nenhuma tarefa encontrada com os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-primary-800">
                {tasksFiltradas.map((t) => {
                  const urgencia = calcularUrgencia(t.due_date);
                  const ehConcluida = t.status === "concluida";
                  const preview = jsonToPlainText(t.descricao).slice(0, 140);
                  const subtasks = subtasksByTask[t.id] || [];
                  const hasSubtasks = subtasks.length > 0;
                  const isExpanded = expandedTasks[t.id];

                  return (
                    <div key={t.id}>
                      <div
                        onClick={() => abrirDetalhes(t.id)}
                        className="px-6 py-4 flex items-center gap-4 hover:bg-primary-800/70 cursor-pointer transition-colors group"
                      >
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

                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            {hasSubtasks && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(t.id);
                                }}
                                className="flex items-center justify-center w-5 h-5 rounded-md text-gray-500 hover:text-gray-100 hover:bg-primary-800"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-3 h-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    transform: isExpanded
                                      ? "rotate(90deg)"
                                      : "rotate(0deg)",
                                    transition: "transform 0.15s ease-out",
                                  }}
                                >
                                  <polyline points="9 6 15 12 9 18" />
                                </svg>
                              </button>
                            )}

                            <div
                              className={`text-[16px] md:text-[17px] ${
                                ehConcluida
                                  ? "text-gray-400 line-through"
                                  : "text-gray-100"
                              }`}
                            >
                              {t.titulo}
                            </div>
                          </div>

                          {preview && (
                            <div className="mt-1 text-[13px] text-gray-400 line-clamp-1">
                              {preview}
                            </div>
                          )}
                        </div>

                        <div className="w-[180px] hidden md:block">
                          <div className="inline-flex items-center px-3 py-1 rounded-lg bg-primary-800 border border-primary-600 text-[12px] text-gray-100">
                            <span className="truncate max-w-[140px]">
                              {projetoNome(t.projeto_id)}
                            </span>
                          </div>
                        </div>

                        <div className="w-[160px] hidden md:flex items-center gap-2">
                          <UrgenciaIndicator nivel={urgencia} />
                          <span className="text-[12px] text-gray-300">
                            {urgencia}
                          </span>
                        </div>

                        <div className="w-[120px] hidden md:block">
                          <span className="text-[13px] text-gray-100">
                            {formatarDataCurta(t.due_date)}
                          </span>
                        </div>

                        <div className="w-[120px] hidden md:block">
                          <span className="text-[13px] text-gray-400">
                            {tempoRelativo(t.created_at)}
                          </span>
                        </div>

                        <div className="w-[40px] flex justify-end">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((current) =>
                                  current === t.id ? null : t.id
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

                            {openMenuId === t.id && (
                              <div
                                className="absolute right-0 mt-2 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
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

                      {hasSubtasks && isExpanded && (
                        <div className="px-6 pb-3">
                          <div className="ml-14 flex flex-col gap-1">
                            {subtasks.map((st) => (
                              <div
                                key={st.id}
                                className="flex items-center gap-3 text-[13px] text-gray-300"
                              >
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await alternarSubtask(st);
                                  }}
                                  className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
                                    st.concluida
                                      ? "border-emerald-400 bg-emerald-400/10"
                                      : "border-primary-700 bg-primary-900 hover:border-primary-500"
                                  }`}
                                >
                                  {st.concluida ? (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="w-3 h-3"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="5 13 10 18 19 7" />
                                    </svg>
                                  ) : (
                                    <div className="w-3 h-3 rounded-full border border-gray-600" />
                                  )}
                                </button>

                                <span
                                  className={
                                    st.concluida
                                      ? "text-gray-500 line-through"
                                      : "text-gray-200"
                                  }
                                >
                                  {st.titulo}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <style jsx global>{`
          .tasks-scroll::-webkit-scrollbar {
            width: 10px;
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
    </div>
  );
}

function UrgenciaIndicator({ nivel }: { nivel: string }) {
  const total = 4;
  let ativos = 0;

  switch (nivel) {
    case "Muito urgente":
      ativos = 4;
      break;
    case "Urgente":
      ativos = 3;
      break;
    case "Normal":
      ativos = 2;
      break;
    case "Baixa":
      ativos = 1;
      break;
    default:
      ativos = 0;
  }

  let colorClass = "bg-primary-500";

  switch (nivel) {
    case "Baixa":
      colorClass = "bg-emerald-400";
      break;
    case "Normal":
      colorClass = "bg-sky-400";
      break;
    case "Urgente":
      colorClass = "bg-amber-400";
      break;
    case "Muito urgente":
      colorClass = "bg-rose-500";
      break;
    case "Vencida":
      colorClass = "bg-slate-400";
      break;
    case "Sem prioridade":
      colorClass = "bg-slate-500";
      break;
  }

  const barras = Array.from({ length: total }, (_, i) => i < ativos);

  return (
    <div className="flex items-end gap-[3px]">
      {barras.map((ativa, idx) => (
        <div
          key={idx}
          className={`w-[3px] rounded-full ${
            ativa ? colorClass : "bg-primary-800"
          }`}
          style={{ height: 6 + idx * 3 }}
        />
      ))}
    </div>
  );
}