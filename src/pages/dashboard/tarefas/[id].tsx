"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import { updateTask, deleteTask } from "@/lib/supabaseQueries/tasks";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";

interface Task {
  id: string;
  titulo: string;
  descricao: any;
  projeto_id: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Projeto {
  id: string;
  titulo: string;
}

interface Subtask {
  id: string;
  task_id: string | null;
  titulo: string;
  concluida: boolean | null;
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

function tempoRelativo(dateStr: string) {
  const d = new Date(dateStr);
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

function formatarDataCurta(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
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
  }
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${
            i < ativos ? "bg-primary-500" : "bg-primary-700"
          }`}
          style={{ height: 6 + i * 3 }}
        />
      ))}
    </div>
  );
}

export default function DetalhesTarefaPage() {
  const params = useParams() || {};
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);

  const editorDescricao = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] })
    ]
  });

  async function carregarDados() {
    if (!id) return;

    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: tarefaDb } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    setTask(tarefaDb || null);

    const { data: projDb } = await supabase
      .from("projetos")
      .select("id, titulo")
      .eq("id", tarefaDb?.projeto_id || "")
      .single();

    setProjeto(projDb || null);

    const { data: subsDb } = await supabase
      .from("subtasks")
      .select("*")
      .eq("task_id", id)
      .eq("user_id", user.id);

    setSubtasks(subsDb || []);

    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, [id]);

  useEffect(() => {
    if (editorDescricao && task) {
      editorDescricao.commands.setContent(task.descricao || "<p></p>");
    }
  }, [editorDescricao, task]);

  async function alternarStatus() {
    if (!task) return;
    const novo = task.status === "concluida" ? "para_fazer" : "concluida";
    await updateTask(task.id, { status: novo });
    setTask({ ...task, status: novo });
  }

  async function alternarSubtask(st: Subtask) {
    const nova = !st.concluida;
    await supabase.from("subtasks").update({ concluida: nova }).eq("id", st.id);
    setSubtasks((prev) =>
      prev.map((x) => (x.id === st.id ? { ...x, concluida: nova } : x))
    );
  }

  async function excluir() {
    if (!task) return;
    if (!confirm("Excluir esta tarefa?")) return;
    await deleteTask(task.id);
    router.push("/dashboard/tarefas");
  }

  if (loading)
    return (
      <div className="h-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Carregando tarefa...
      </div>
    );

  if (!task)
    return (
      <div className="h-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Tarefa não encontrada.
      </div>
    );

  const urgencia = calcularUrgencia(task.due_date);

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 pr-6 py-8 gap-8 overflow-hidden">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/tarefas")}
              className="w-10 h-10 flex items-center justify-center border border-primary-700 rounded-full hover:bg-primary-800 text-gray-300"
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
            </button>

            <span className="text-[26px] font-semibold text-gray-100">
              {task.titulo}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                router.push(`/dashboard/tarefas/editar/${task.id}`)
              }
              className="px-5 py-2.5 rounded-lg border border-primary-700 text-gray-200 text-[15px] hover:bg-primary-800"
            >
              Editar tarefa
            </button>

            <button
              onClick={excluir}
              className="px-5 py-2.5 rounded-lg bg-red-500/20 border border-red-400 text-red-300 text-[15px] hover:bg-red-500/30"
            >
              Excluir
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto pb-6 pr-2 custom-scrollbar">
          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-8 flex flex-col gap-10">
            <div className="flex items-center gap-3">
              <button
                onClick={alternarStatus}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  task.status === "concluida"
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-primary-600 bg-primary-900"
                }`}
              >
                {task.status === "concluida" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="5 13 10 18 19 7" />
                  </svg>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                )}
              </button>

              <span
                className={`text-[18px] ${
                  task.status === "concluida"
                    ? "text-gray-400 line-through"
                    : "text-gray-200"
                }`}
              >
                {task.titulo}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-primary-900 border border-primary-700 rounded-xl p-5">
                <span className="text-[13px] text-gray-400">Urgência</span>
                <div className="mt-2 flex items-center gap-2">
                  <UrgenciaIndicator nivel={urgencia} />
                  <span className="text-[15px] text-gray-100">{urgencia}</span>
                </div>
              </div>

              <div className="bg-primary-900 border border-primary-700 rounded-xl p-5">
                <span className="text-[13px] text-gray-400">Vencimento</span>
                <div className="mt-2 text-[15px] text-gray-100">
                  {formatarDataCurta(task.due_date)}
                </div>
              </div>

              <div className="bg-primary-900 border border-primary-700 rounded-xl p-5">
                <span className="text-[13px] text-gray-400">Criada</span>
                <div className="mt-2 text-[15px] text-gray-100">
                  {tempoRelativo(task.created_at)}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[13px] text-gray-400">Projeto</span>
              <div className="mt-1 inline-flex items-center px-4 py-2 border border-primary-700 bg-primary-900 rounded-xl text-gray-100 text-[15px]">
                {projeto?.titulo || "—"}
              </div>
            </div>

            {subtasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[13px] text-gray-400">Subtarefas</span>

                <div className="bg-primary-900 border border-primary-700 rounded-xl p-5 flex flex-col gap-3">
                  {subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-3">
                      <button
                        onClick={() => alternarSubtask(st)}
                        className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                          st.concluida
                            ? "border-emerald-400 bg-emerald-400/10"
                            : "border-primary-600 bg-primary-900"
                        }`}
                      >
                        {st.concluida ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="w-3.5 h-3.5 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="5 13 10 18 19 7" />
                          </svg>
                        ) : (
                          <div className="w-3.5 h-3.5 border border-gray-600 rounded-full" />
                        )}
                      </button>

                      <span
                        className={`text-[15px] ${
                          st.concluida
                            ? "text-gray-500 line-through"
                            : "text-gray-200"
                        }`}
                      >
                        {st.titulo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-gray-400">Descrição</span>
              <div className="bg-primary-900 border border-primary-700 rounded-xl p-5">
                <EditorContent editor={editorDescricao} className="tiptap" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--primary-500);
          border-radius: 999px;
        }
        .tiptap p {
          margin-bottom: 0.45rem;
        }
        .tiptap h1 {
          font-size: 1.4rem;
          font-weight: 600;
          margin: 0.75rem 0 0.4rem;
        }
        .tiptap h2 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0.7rem 0 0.35rem;
        }
        .tiptap h3 {
          font-size: 1.05rem;
          font-weight: 600;
          margin: 0.6rem 0 0.3rem;
        }
        .tiptap ul {
          list-style: disc;
          padding-left: 1.25rem;
        }
        .tiptap ol {
          list-style: decimal;
          padding-left: 1.25rem;
        }
        .tiptap blockquote {
          border-left: 3px solid rgba(148, 163, 184, 0.8);
          padding-left: 0.75rem;
          font-style: italic;
        }
        .tiptap a {
          color: #38bdf8;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}