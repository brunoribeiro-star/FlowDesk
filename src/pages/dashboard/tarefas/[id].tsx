"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import { updateTask, deleteTask } from "@/lib/supabaseQueries/tasks";
import { Clock, ArrowLeft, CheckCircle2, Circle, Calendar } from "lucide-react";
import { calcularUrgencia, tempoRelativo, formatarData } from "@/lib/utils";
import UrgenciaIndicator from "@/components/UrgenciaIndicator";

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
    ], 
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm sm:prose-base max-w-none focus:outline-none min-h-[80px] text-gray-200",
      },
    },
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
      .eq("user_id", user.id)
      .order("id", { ascending: true });

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
    setTask({ ...task, status: novo });
    await updateTask(task.id, { status: novo });
  }

  async function alternarSubtask(st: Subtask) {
    const nova = !st.concluida;
    setSubtasks((prev) =>
      prev.map((x) => (x.id === st.id ? { ...x, concluida: nova } : x))
    );
    await supabase.from("subtasks").update({ concluida: nova }).eq("id", st.id);
  }

  async function excluir() {
    if (!task) return;
    if (!confirm("Excluir esta tarefa?")) return;
    await deleteTask(task.id);
    router.push("/dashboard/tarefas");
  }

  if (loading)
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Carregando tarefa...
      </div>
    );

  if (!task)
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-400">
        Tarefa não encontrada.
      </div>
    );

  const urgencia = calcularUrgencia(task.due_date);

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        <header className="flex items-center justify-between px-8 py-6 border-b border-primary-800 bg-primary-900 z-10">
          <button
            onClick={() => router.push("/dashboard/tarefas")}
            className="flex items-center gap-2 group text-gray-400 hover:text-white transition-colors"
          >
             <div className="p-2 rounded-full border border-primary-700 group-hover:bg-primary-800 transition-colors">
              <ArrowLeft size={18} />
            </div>
            <span className="text-sm font-medium">Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            {task.status !== "concluida" && (
                <button
                    onClick={() => router.push(`/dashboard/tarefas/cronometro?taskId=${task.id}`)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-all shadow-lg shadow-primary-500/20"
                    title="Focar na tarefa"
                >
                    <Clock size={18} />
                </button>
            )}

            <button
               onClick={excluir}
               className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20"
               title="Excluir tarefa"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>

            <button
              onClick={() => router.push(`/dashboard/tarefas/editar/${task.id}`)}
              className="flex items-center gap-2 bg-black hover:bg-slate-900 border border-primary-700 text-white font-medium px-5 py-2.5 rounded-full transition-all text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              <span>Editar</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="max-w-4xl mx-auto px-8 py-10 flex flex-col gap-10">
            
            <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                     <button
                        onClick={alternarStatus}
                        className={`mt-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        task.status === "concluida"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                            : "border-gray-500 hover:border-gray-400 text-transparent"
                        }`}
                        title={task.status === "concluida" ? "Reabrir tarefa" : "Concluir tarefa"}
                    >
                         {task.status === "concluida" && <CheckCircle2 size={14} />}
                    </button>
                    
                    <div className="flex-1">
                         <h1 className={`text-3xl font-medium leading-tight ${task.status === "concluida" ? "text-gray-500 line-through" : "text-gray-100"}`}>
                            {task.titulo}
                         </h1>
                    </div>

                     <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-primary-800/50 border border-primary-700 text-xs text-primary-300 font-medium">
                        {calculoDiasRestantes(task.due_date)}
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-primary-700 border border-primary-700 rounded-2xl bg-primary-800/20 text-sm overflow-hidden">
                     <div className="p-5 flex flex-col gap-1">
                        <span className="font-semibold text-gray-100">Vencimento</span>
                        <span className="text-gray-400">{formatarData(task.due_date)}</span>
                     </div>
                     <div className="p-5 flex flex-col gap-2">
                        <span className="font-semibold text-gray-100">Urgência</span>
                         <div className="flex items-center gap-2">
                             <UrgenciaIndicator nivel={urgencia} />
                             <span className="text-gray-400">{urgencia}</span>
                         </div>
                     </div>
                     <div className="p-5 flex flex-col gap-1">
                        <span className="font-semibold text-gray-100">Criação</span>
                        <span className="text-gray-400">{tempoRelativo(task.created_at)}</span>
                     </div>
                 </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-5 h-5 rounded-full bg-gray-100 text-black flex items-center justify-center font-bold text-[10px]">
                     N
                </div>
                <span>{projeto?.titulo || "Sem projeto"}</span>
            </div>

            <div className="space-y-4 pt-4 border-t border-primary-800">
                 <h2 className="text-lg font-semibold text-gray-100">Descrição da Tarefa</h2>
                 <div className="bg-primary-800/20 border border-primary-700 rounded-xl p-6 min-h-[100px]">
                    <EditorContent editor={editorDescricao} />
                 </div>
            </div>

            {subtasks.length > 0 && (
                 <div className="space-y-4 pt-4 border-t border-primary-800">
                    <h2 className="text-lg font-semibold text-gray-100">Subtarefas</h2>
                    <div className="bg-primary-800/20 border border-primary-700 rounded-xl p-2 flex flex-col gap-1">
                        {subtasks.map((st) => (
                             <div 
                                key={st.id} 
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-800/40 transition-colors cursor-pointer group"
                                onClick={() => alternarSubtask(st)}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${st.concluida ? "bg-primary-500 border-primary-500 text-white" : "border-gray-500 group-hover:border-gray-300"}`}>
                                    {st.concluida && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className={`text-sm flex-1 ${st.concluida ? "text-gray-500 line-through" : "text-gray-200"}`}>
                                    {st.titulo}
                                </span>
                             </div>
                        ))}
                    </div>
                </div>
            )}

             <div className="h-10" />

          </div>
        </div>
      </div>
    </div>
  );
}

function calculoDiasRestantes(dateStr: string | null) {
    if (!dateStr) return "Sem prazo";
    const d = new Date(dateStr + "T00:00:00");
    const diff = d.getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Vencida";
    if (days === 0) return "Vence hoje";
    if (days === 1) return "Amanhã";
    return `Em ${days} dias`;
}