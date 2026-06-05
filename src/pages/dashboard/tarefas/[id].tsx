"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { updateTask, deleteTask } from "@/lib/supabaseQueries/tasks";
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

const IconChevLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
  </svg>
);
const IconTrash = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);
const IconCheck = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5 9-10"/>
  </svg>
);

function calculoDiasRestantes(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const diff = d.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Vencida", urgent: true };
  if (days === 0) return { label: "Vence hoje", urgent: true };
  if (days === 1) return { label: "Amanhã", urgent: false };
  return { label: `Em ${days} dias`, urgent: false };
}

export default function DetalhesTarefaPage() {
  const params = useParams() || {};
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();

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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none min-h-[80px] det-ed-content",
      },
    },
  });

  async function carregarDados() {
    if (!id) return;
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) { router.push("/login"); return; }

    const { data: tarefaDb } = await supabase.from("tasks").select("*").eq("id", id).eq("user_id", user.id).single();
    setTask(tarefaDb || null);

    if (tarefaDb?.projeto_id) {
      const { data: projDb } = await supabase.from("projetos").select("id, titulo").eq("id", tarefaDb.projeto_id).single();
      setProjeto(projDb || null);
    }

    const { data: subsDb } = await supabase.from("subtasks").select("*").eq("task_id", id).eq("user_id", user.id).order("id", { ascending: true });
    setSubtasks(subsDb || []);

    setLoading(false);
  }

  useEffect(() => { carregarDados(); }, [id]);

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
    setSubtasks((prev) => prev.map((x) => (x.id === st.id ? { ...x, concluida: nova } : x)));
    await supabase.from("subtasks").update({ concluida: nova }).eq("id", st.id);
  }

  async function excluir() {
    if (!task) return;
    if (!confirm("Excluir esta tarefa?")) return;
    await deleteTask(task.id);
    router.push("/dashboard/tarefas");
  }

  if (loading) return (
    <div className="det-state-screen">
      <span className="det-state-text">Carregando tarefa…</span>
    </div>
  );

  if (!task) return (
    <div className="det-state-screen">
      <span className="det-state-text">Tarefa não encontrada.</span>
    </div>
  );

  const urgencia = calcularUrgencia(task.due_date);
  const ehConcluida = task.status === "concluida";
  const diasRestantes = calculoDiasRestantes(task.due_date);
  const completedSubs = subtasks.filter(s => s.concluida).length;

  return (
    <>
      <div className="det-page">

        <header className="det-top">
          <button type="button" onClick={() => router.push("/dashboard/tarefas")} className="det-back-btn">
            <IconChevLeft /> Voltar
          </button>

          <div className="det-actions">
            {!ehConcluida && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/tarefas/cronometro?taskId=${task.id}`)}
                className="det-icon-btn"
                title="Focar na tarefa"
              >
                <IconClock />
              </button>
            )}
            <button
              type="button"
              onClick={excluir}
              className="det-icon-btn danger"
              title="Excluir tarefa"
            >
              <IconTrash />
            </button>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/tarefas/editar/${task.id}`)}
              className="det-btn-edit"
            >
              <IconPencil /> Editar
            </button>
          </div>
        </header>

        <div className="det-scroll custom-scroll">
          <div className="det-body">

            <div className="det-title-area">
              <button
                type="button"
                className={"det-chk-lg" + (ehConcluida ? " is-done" : "")}
                onClick={alternarStatus}
                title={ehConcluida ? "Reabrir tarefa" : "Concluir tarefa"}
              >
                {ehConcluida && <IconCheck size={18} />}
              </button>

              <div className="det-title-content">
                <h1 className={"det-title" + (ehConcluida ? " is-done" : "")}>{task.titulo}</h1>
                {diasRestantes && (
                  <span className={"det-prazo-badge" + (diasRestantes.urgent ? " urgent" : "")}>
                    {diasRestantes.label}
                  </span>
                )}
              </div>
            </div>

            <div className="det-meta-strip">
              <div className="det-meta-card">
                <span className="det-meta-label">Vencimento</span>
                <span className="det-meta-value">{formatarData(task.due_date)}</span>
              </div>
              <div className="det-meta-card">
                <span className="det-meta-label">Urgência</span>
                <div className="det-meta-urg">
                  <UrgenciaIndicator nivel={urgencia} />
                  <span className="det-meta-value">{urgencia}</span>
                </div>
              </div>
              <div className="det-meta-card">
                <span className="det-meta-label">Criação</span>
                <span className="det-meta-value">{tempoRelativo(task.created_at)}</span>
              </div>
              {subtasks.length > 0 && (
                <div className="det-meta-card">
                  <span className="det-meta-label">Subtarefas</span>
                  <span className="det-meta-value">{completedSubs}/{subtasks.length} concluídas</span>
                </div>
              )}
            </div>

            {projeto && (
              <div className="det-proj-row">
                <span className="det-proj-dot" />
                <span className="tk-pill">{projeto.titulo}</span>
              </div>
            )}

            <div className="det-section">
              <h2 className="det-section-title">Descrição</h2>
              <div className="det-editor-wrap">
                <EditorContent editor={editorDescricao} />
              </div>
            </div>

            {subtasks.length > 0 && (
              <div className="det-section">
                <h2 className="det-section-title">Subtarefas</h2>
                <div className="det-subs-wrap">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="det-sub-row"
                      onClick={() => alternarSubtask(st)}
                    >
                      <span className={"det-sub-chk" + (st.concluida ? " is-done" : "")}>
                        {st.concluida && <IconCheck size={14} />}
                      </span>
                      <span className={"det-sub-label" + (st.concluida ? " is-done" : "")}>
                        {st.titulo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style jsx global>{`
        /* ===== STATE SCREENS ===== */
        .det-state-screen {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .det-state-text {
          font-size: 15px;
          color: var(--gray-500);
        }

        /* ===== PAGE ===== */
        .det-page {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        /* ===== HEADER ===== */
        .det-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 40px;
          border-bottom: 1px solid var(--gray-800);
          flex-shrink: 0;
        }
        .det-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 44px;
          padding: 0 18px 0 14px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          color: var(--gray-300);
          cursor: pointer;
          border-radius: 999px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          transition: .2s;
        }
        .det-back-btn:hover {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }
        .det-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .det-icon-btn {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-300);
          cursor: pointer;
          transition: .2s;
        }
        .det-icon-btn:hover {
          border-color: var(--primary-600);
          color: var(--gray-100);
        }
        .det-icon-btn.danger {
          color: var(--error-medium);
          border-color: var(--gray-700);
        }
        .det-icon-btn.danger:hover {
          border-color: var(--error-medium);
          background: var(--primary-800);
        }
        .det-btn-edit {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 44px;
          padding: 0 20px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 8px 20px -8px var(--primary-500);
          transition: .2s;
        }
        .det-btn-edit:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px -8px var(--primary-500);
        }

        /* ===== SCROLL BODY ===== */
        .det-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .det-body {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          padding: 40px 40px 64px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* ===== TITLE AREA ===== */
        .det-title-area {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--gray-800);
        }
        .det-chk-lg {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1.5px solid var(--gray-600);
          color: var(--primary-900);
          background: none;
          cursor: pointer;
          transition: .2s;
          margin-top: 6px;
        }
        .det-chk-lg:not(.is-done):hover {
          border-color: var(--primary-400);
        }
        .det-chk-lg.is-done {
          background: var(--success-medium);
          border-color: transparent;
        }
        .det-title-content {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 14px;
        }
        .det-title {
          flex: 1;
          min-width: 0;
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: var(--gray-100);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .det-title.is-done {
          color: var(--gray-500);
          text-decoration: line-through;
        }
        .det-prazo-badge {
          display: inline-flex;
          align-items: center;
          height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-200);
          background: var(--primary-700);
          border: 1px solid var(--primary-600);
          white-space: nowrap;
          flex-shrink: 0;
          margin-top: 8px;
        }
        .det-prazo-badge.urgent {
          color: var(--error-light);
          background: var(--primary-800);
          border-color: var(--error-medium);
        }

        /* ===== METADATA STRIP ===== */
        .det-meta-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .det-meta-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px 20px;
          border-radius: 14px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
        }
        .det-meta-label {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--gray-400);
        }
        .det-meta-value {
          font-size: 15px;
          font-weight: 500;
          color: var(--gray-200);
        }
        .det-meta-urg {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ===== PROJECT PILL ===== */
        .det-proj-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .det-proj-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary-400);
          flex-shrink: 0;
        }
        .tk-pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--primary-200);
          background: var(--primary-700);
          border: 1px solid var(--primary-600);
          white-space: nowrap;
        }

        /* ===== SECTIONS ===== */
        .det-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .det-section-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gray-400);
        }
        .det-editor-wrap {
          border: 1px solid var(--gray-700);
          border-radius: 16px;
          background: var(--primary-800);
          overflow: hidden;
        }
        .det-ed-content {
          padding: 20px 22px;
          font-size: 16px;
          color: var(--gray-200);
          line-height: 1.6;
        }

        /* ===== SUBTASKS ===== */
        .det-subs-wrap {
          border: 1px solid var(--gray-700);
          border-radius: 16px;
          background: var(--primary-800);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .det-sub-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          cursor: pointer;
          transition: background .15s;
          border-bottom: 1px solid var(--gray-800);
        }
        .det-sub-row:last-child { border-bottom: none; }
        .det-sub-row:hover { background: var(--primary-700); }
        .det-sub-chk {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 6px;
          border: 1.5px solid var(--gray-600);
          color: var(--primary-900);
          transition: .15s;
        }
        .det-sub-chk.is-done {
          background: var(--success-medium);
          border-color: transparent;
        }
        .det-sub-row:hover .det-sub-chk:not(.is-done) {
          border-color: var(--primary-400);
        }
        .det-sub-label {
          font-size: 15px;
          color: var(--gray-200);
          flex: 1;
        }
        .det-sub-label.is-done {
          color: var(--gray-500);
          text-decoration: line-through;
        }

        /* TipTap read-only content */
        .tiptap-editor { line-height: 1.65; }
        .tiptap-editor strong { font-weight: 700; }
        .tiptap-editor em { font-style: italic; }
        .tiptap-editor u { text-decoration: underline; }
        .tiptap-editor ul { list-style: disc; padding-left: 1.25rem; }
        .tiptap-editor ol { list-style: decimal; padding-left: 1.25rem; }
        .tiptap-editor li { margin: 0.15rem 0; }
        .tiptap-editor blockquote {
          border-left: 3px solid var(--gray-600);
          padding-left: 0.9rem;
          color: var(--gray-300);
          margin: 0.75rem 0;
        }
        .tiptap-editor a { color: var(--primary-400); text-decoration: underline; text-underline-offset: 2px; }
        .tiptap-editor p { margin: 0.35rem 0; }
        .tiptap-editor h1, .tiptap-editor h2, .tiptap-editor h3 {
          margin: 0.6rem 0 0.35rem;
          line-height: 1.25;
          font-weight: 700;
          color: var(--gray-100);
        }
        .tiptap-editor .ProseMirror-focused { outline: none; }
      `}</style>
    </>
  );
}
