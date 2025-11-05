"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

type Projeto = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  cliente_id: string | null;
  orcamento: number | null;
  data_inicio: string | null;
  prazo_entrega: string | null;
  status: "Em andamento" | "Concluído" | "Arquivado";
  progresso: number | null;
  link_arquivos: string | null;
  etapa_atual: string | null;
  notas_internas: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { id: string; nome: string | null; empresa: string | null } | null;
};

type Task = {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  concluida: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type Subtask = {
  id: string;
  task_id: string;
  titulo: string;
  concluida: boolean;
  created_at: string;
  updated_at: string;
};

type ArquivoProjeto = {
  id: string;
  projeto_id: string;
  nome: string;
  url: string;
  status: "pendente" | "aprovado";
  created_at: string;
};

type LinkProjeto = {
  id: string;
  projeto_id: string;
  titulo: string | null;
  url: string;
  created_at: string;
};

type Briefing = {
  id: string;
  projeto_id: string;
  respostas: any;
  created_at: string;
};

function Modal({
  open,
  title,
  children,
  onClose,
  actions,
}: {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-primary-800 border border-primary-700 rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[20px] text-primary-100 font-semibold">{title}</h4>
            <button
              onClick={onClose}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-3 py-1 hover:bg-primary-700"
            >
              Fechar
            </button>
          </div>
        ) : null}
        <div className="text-gray-100">{children}</div>
        {actions ? <div className="mt-6 flex items-center justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export default function ProjetoDetalhesPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>({});
  const [files, setFiles] = useState<ArquivoProjeto[]>([]);
  const [links, setLinks] = useState<LinkProjeto[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({ titulo: "", descricao: "", due_date: "" });
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [newSubtaskByTask, setNewSubtaskByTask] = useState<Record<string, string>>({});

  const [newLink, setNewLink] = useState({ titulo: "", url: "" });

  const [showBriefing, setShowBriefing] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; msg: string; onYes?: () => void }>({
    open: false,
    msg: "",
  });
  const [notify, setNotify] = useState<{ open: boolean; msg: string }>({ open: false, msg: "" });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: projetoData, error: projetoErr } = await supabase
          .from("projetos")
          .select(
            `
            *,
            clientes:cliente_id ( id, nome, empresa )
          `
          )
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        if (projetoErr) throw projetoErr;
        const proj = projetoData as Projeto;
        setProjeto(proj);

        const { data: tasksData, error: tasksErr } = await supabase
          .from("tasks")
          .select("*")
          .eq("projeto_id", id)
          .order("created_at", { ascending: true });
        if (tasksErr) throw tasksErr;
        const tks = (tasksData || []) as Task[];
        setTasks(tks);

        if (tks.length) {
          const taskIds = tks.map((t) => t.id);
          const { data: subsData, error: subsErr } = await supabase
            .from("subtasks")
            .select("*")
            .in("task_id", taskIds)
            .order("created_at", { ascending: true });
          if (subsErr) throw subsErr;
          const grouped: Record<string, Subtask[]> = {};
          (subsData || []).forEach((s: any) => {
            grouped[s.task_id] = grouped[s.task_id] || [];
            grouped[s.task_id].push(s as Subtask);
          });
          setSubtasksByTask(grouped);
        } else {
          setSubtasksByTask({});
        }

        const { data: filesData, error: filesErr } = await supabase
          .from("arquivos_projeto")
          .select("*")
          .eq("projeto_id", id)
          .order("created_at", { ascending: false });
        if (filesErr) throw filesErr;
        setFiles((filesData || []) as ArquivoProjeto[]);

        const { data: linksData, error: linksErr } = await supabase
          .from("links_projeto")
          .select("*")
          .eq("projeto_id", id)
          .order("created_at", { ascending: false });
        if (linksErr) throw linksErr;
        setLinks((linksData || []) as LinkProjeto[]);

        const { data: briefData } = await supabase
          .from("briefings")
          .select("*")
          .eq("projeto_id", id)
          .maybeSingle();
        if (briefData) setBriefing(briefData as Briefing);

        await updateProgress(tks, proj);
        await notifyDueTasks(tks, proj);

        setError(null);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar o projeto.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const pct = useMemo(() => {
    const flatDone = tasks.filter((t) => t.concluida).length;
    const flatTotal = tasks.length;
    if (flatTotal === 0) return 0;

    let subDone = 0;
    let subTotal = 0;
    for (const t of tasks) {
      const subs = subtasksByTask[t.id] || [];
      subDone += subs.filter((s) => s.concluida).length;
      subTotal += subs.length;
    }

    const taskRatio = flatDone / flatTotal;
    const subRatio = subTotal > 0 ? subDone / subTotal : taskRatio;

    return Math.round(((taskRatio + subRatio) / 2) * 100);
  }, [tasks, subtasksByTask]);

  async function updateProgress(currTasks: Task[], proj: Projeto | null) {
    if (!proj) return;

    const flatDone = currTasks.filter((t) => t.concluida).length;
    const flatTotal = currTasks.length;
    let subDone = 0;
    let subTotal = 0;
    for (const t of currTasks) {
      const subs = subtasksByTask[t.id] || [];
      subDone += subs.filter((s) => s.concluida).length;
      subTotal += subs.length;
    }
    const taskRatio = flatTotal > 0 ? flatDone / flatTotal : 0;
    const subRatio = subTotal > 0 ? subDone / subTotal : taskRatio;
    const newPct = Math.round(((taskRatio + subRatio) / 2) * 100);

    if (proj.progresso === newPct) return;

    const nextStatus =
      proj.status === "Arquivado"
        ? "Arquivado"
        : newPct >= 100
        ? ("Concluído" as Projeto["status"])
        : ("Em andamento" as Projeto["status"]);

    const { error } = await supabase
      .from("projetos")
      .update({ progresso: newPct, status: nextStatus })
      .eq("id", proj.id);

    if (!error) {
      setProjeto((p) => (p ? { ...p, progresso: newPct, status: nextStatus } : p));
      try {
        await supabase.from("atividades").insert([
          {
            user_id: proj.user_id,
            projeto_id: proj.id,
            tipo: "Projetos",
            descricao:
              newPct >= 100
                ? "Projeto concluído automaticamente pelo progresso."
                : `Progresso atualizado para ${newPct}%.`,
          },
        ]);
      } catch {}
    }
  }

  async function notifyDueTasks(currTasks: Task[], proj: Projeto | null) {
    if (!proj || !currTasks.length) return;
    const now = Date.now();
    const soonMs = 48 * 60 * 60 * 1000; // 48h

    const nearDue = currTasks.filter((t) => {
      if (!t.due_date || t.concluida) return false;
      const d = new Date(t.due_date).getTime();
      return d - now <= soonMs && d > now;
    });

    if (!nearDue.length) return;

    try {
      await supabase.from("atividades").insert(
        nearDue.map((t) => ({
          user_id: proj.user_id,
          projeto_id: proj.id,
          tipo: "Projetos",
          descricao: `Task "${t.titulo}" com prazo próximo (${new Date(
            t.due_date as string
          ).toLocaleDateString("pt-BR")}).`,
        }))
      );
    } catch {}
  }

  function statusStyles(status: Projeto["status"]) {
    if (status === "Concluído") {
      return { tagBg: "bg-third-400", tagText: "text-primary-100", barFill: "bg-third-400" };
    }
    if (status === "Arquivado") {
      return { tagBg: "bg-gray-400", tagText: "text-primary-900", barFill: "bg-gray-400" };
    }
    return { tagBg: "bg-primary-500", tagText: "text-primary-100", barFill: "bg-primary-400" };
  }
  const styles = statusStyles(projeto?.status || "Em andamento");

  function statusSelectClasses(s: Projeto["status"]) {
    if (s === "Concluído") {
      return {
        select: "bg-third-400 border-third-400 text-primary-100",
        chevron: "fill-primary-100",
      };
    }
    if (s === "Arquivado") {
      return {
        select: "bg-gray-400 border-gray-400 text-primary-900",
        chevron: "fill-primary-900",
      };
    }
    return {
      select: "bg-primary-500 border-primary-500 text-primary-900",
      chevron: "fill-primary-900",
    };
  }

  async function setStatusManually(next: Projeto["status"]) {
    if (!projeto) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projetos")
        .update({ status: next })
        .eq("id", projeto.id);
      if (error) throw error;
      setProjeto((p) => (p ? { ...p, status: next } : p));
      await supabase.from("atividades").insert([
        {
          user_id: projeto.user_id,
          projeto_id: projeto.id,
          tipo: "Projetos",
          descricao: `Status alterado manualmente para "${next}".`,
        },
      ]);
      setNotify({ open: true, msg: "Status atualizado com sucesso." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao alterar status: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.titulo.trim() || !projeto) return;
    setSaving(true);
    try {
      const payload = {
        projeto_id: projeto.id,
        titulo: newTask.titulo.trim(),
        descricao: newTask.descricao.trim() || null,
        due_date: newTask.due_date ? newTask.due_date : null,
        concluida: false,
      };
      const { data, error } = await supabase
        .from("tasks")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      const created = data as Task;
      const next = [...tasks, created];
      setTasks(next);
      setNewTask({ titulo: "", descricao: "", due_date: "" });
      await updateProgress(next, projeto);
      await supabase.from("atividades").insert([
        {
          user_id: projeto.user_id,
          projeto_id: projeto.id,
          tipo: "Projetos",
          descricao: `Task criada: ${created.titulo}`,
        },
      ]);
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao criar task: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  function askRemoveTask(task: Task) {
    setConfirm({
      open: true,
      msg: `Tem certeza que deseja excluir a task "${task.titulo}"?`,
      onYes: () => removeTask(task),
    });
  }

  async function removeTask(task: Task) {
    if (!projeto) return;
    setConfirm({ open: false, msg: "" });
    const backupTasks = tasks;
    const backupSubs = subtasksByTask[task.id] || [];
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const nextGrouped = { ...subtasksByTask };
    delete nextGrouped[task.id];
    setSubtasksByTask(nextGrouped);

    await updateProgress(
      backupTasks.filter((t) => t.id !== task.id),
      projeto
    );

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      setTasks(backupTasks);
      setSubtasksByTask((prev) => ({ ...prev, [task.id]: backupSubs }));
      await updateProgress(backupTasks, projeto);
      setNotify({ open: true, msg: "Erro ao excluir task: " + error.message });
      return;
    }

    try {
      await supabase.from("atividades").insert([
        {
          user_id: projeto.user_id,
          projeto_id: projeto.id,
          tipo: "Projetos",
          descricao: `Task removida: ${task.titulo}`,
        },
      ]);
    } catch {}
  }

  async function toggleTask(task: Task) {
    if (!projeto) return;
    const newVal = !task.concluida;

    const temp = tasks.map((t) => (t.id === task.id ? { ...t, concluida: newVal } : t));
    setTasks(temp);
    await updateProgress(temp, projeto);

    const { error } = await supabase.from("tasks").update({ concluida: newVal }).eq("id", task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, concluida: task.concluida } : t)));
      await updateProgress(tasks, projeto);
      setNotify({ open: true, msg: "Erro ao atualizar task: " + error.message });
      return;
    }

    try {
      await supabase.from("atividades").insert([
        {
          user_id: projeto.user_id,
          projeto_id: projeto.id,
          tipo: "Projetos",
          descricao: newVal
            ? `Task concluída: ${task.titulo}`
            : `Task reaberta: ${task.titulo}`,
        },
      ]);
    } catch {}
  }

  function openEditTask(t: Task) {
    setEditTask(t);
  }

  async function saveEditTask() {
    if (!editTask || !projeto) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          titulo: editTask.titulo,
          descricao: editTask.descricao,
          due_date: editTask.due_date,
        })
        .eq("id", editTask.id);
      if (error) throw error;

      setTasks((prev) => prev.map((t) => (t.id === editTask.id ? { ...editTask } : t)));
      setEditTask(null);
      setNotify({ open: true, msg: "Task atualizada com sucesso." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao atualizar task: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  function toggleExpand(taskId: string) {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  async function addSubtask(taskId: string) {
    const title = (newSubtaskByTask[taskId] || "").trim();
    if (!title) return;
    try {
      const { data, error } = await supabase
        .from("subtasks")
        .insert([{ task_id: taskId, titulo: title, concluida: false }])
        .select()
        .single();
      if (error) throw error;
      const created = data as Subtask;
      setSubtasksByTask((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), created],
      }));
      setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: "" }));
      if (projeto) await updateProgress(tasks, projeto);
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao adicionar subtask: " + err.message });
    }
  }

  async function toggleSubtask(taskId: string, s: Subtask) {
    const newVal = !s.concluida;
    setSubtasksByTask((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map((x) => (x.id === s.id ? { ...x, concluida: newVal } : x)),
    }));
    const { error } = await supabase.from("subtasks").update({ concluida: newVal }).eq("id", s.id);
    if (error) {
      setSubtasksByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map((x) => (x.id === s.id ? { ...x, concluida: s.concluida } : x)),
      }));
      setNotify({ open: true, msg: "Erro ao atualizar subtask: " + error.message });
      return;
    }
    if (projeto) await updateProgress(tasks, projeto);
  }

  function askRemoveSubtask(taskId: string, s: Subtask) {
    setConfirm({
      open: true,
      msg: `Remover a subtask "${s.titulo}"?`,
      onYes: () => removeSubtask(taskId, s),
    });
  }

  async function removeSubtask(taskId: string, s: Subtask) {
    setConfirm({ open: false, msg: "" });
    const backup = subtasksByTask[taskId] || [];
    setSubtasksByTask((prev) => ({
      ...prev,
      [taskId]: backup.filter((x) => x.id !== s.id),
    }));
    const { error } = await supabase.from("subtasks").delete().eq("id", s.id);
    if (error) {
      setSubtasksByTask((prev) => ({ ...prev, [taskId]: backup }));
      setNotify({ open: true, msg: "Erro ao excluir subtask: " + error.message });
      return;
    }
    if (projeto) await updateProgress(tasks, projeto);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!projeto) return;
    const filesSel = e.target.files;
    if (!filesSel || !filesSel.length) return;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      setNotify({ open: true, msg: "Usuário não autenticado." });
      return;
    }

    const file = filesSel[0];
    const filePath = `${user.id}/${projeto.id}/${Date.now()}_${file.name}`;

    try {
      setSaving(true);
      const { error: upErr } = await supabase.storage
        .from("projetos")
        .upload(filePath, file, { upsert: false });
      if (upErr) {
        if ((upErr as any)?.message?.toLowerCase?.().includes("bucket not found")) {
          throw new Error(
            "Bucket 'projetos' não encontrado no Supabase Storage. Crie um bucket público chamado exatamente 'projetos'."
          );
        }
        throw upErr;
      }

      const { data: publicUrl } = supabase.storage.from("projetos").getPublicUrl(filePath);

      const { data, error: insErr } = await supabase
        .from("arquivos_projeto")
        .insert([{ projeto_id: projeto.id, nome: file.name, url: publicUrl.publicUrl, status: "pendente" }])
        .select()
        .single();
      if (insErr) throw insErr;

      setFiles((prev) => [data as ArquivoProjeto, ...prev]);
      await supabase.from("atividades").insert([
        {
          user_id: projeto.user_id,
          projeto_id: projeto.id,
          tipo: "Projetos",
          descricao: `Arquivo enviado: ${file.name}`,
        },
      ]);
      setNotify({ open: true, msg: "Arquivo enviado com sucesso." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao enviar arquivo: " + err.message });
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!projeto) return;
    const url = newLink.url.trim();
    if (!url) return;
    try {
      const { data, error } = await supabase
        .from("links_projeto")
        .insert([{ projeto_id: projeto.id, titulo: newLink.titulo || null, url }])
        .select()
        .single();
      if (error) throw error;
      setLinks((prev) => [data as LinkProjeto, ...prev]);
      setNewLink({ titulo: "", url: "" });
      setNotify({ open: true, msg: "Link adicionado." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao adicionar link: " + err.message });
    }
  }

  function renderBriefing(respostas: any) {
    if (!respostas) return <div className="text-gray-400">—</div>;
    if (Array.isArray(respostas)) {
      return (
        <ul className="flex flex-col gap-2">
          {respostas.map((item: any, idx: number) => (
            <li key={idx} className="bg-primary-700 border border-primary-600 rounded-lg px-4 py-3">
              <div className="text-primary-100 font-medium">{item.pergunta ?? `Pergunta ${idx + 1}`}</div>
              <div className="text-gray-300">{item.resposta ?? "—"}</div>
            </li>
          ))}
        </ul>
      );
    }
    if (typeof respostas === "object") {
      return (
        <ul className="flex flex-col gap-2">
          {Object.entries(respostas).map(([pergunta, resposta], idx) => (
            <li key={idx} className="bg-primary-700 border border-primary-600 rounded-lg px-4 py-3">
              <div className="text-primary-100 font-medium">{pergunta}</div>
              <div className="text-gray-300">{String(resposta)}</div>
            </li>
          ))}
        </ul>
      );
    }
    return <div className="text-gray-300 whitespace-pre-wrap">{String(respostas)}</div>;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center">
        Carregando…
      </div>
    );
  }
  if (error || !projeto) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center">
        {error || "Projeto não encontrado."}
      </div>
    );
  }

  const clienteNome = projeto.clientes?.nome || "Cliente não informado";
  const selectColor = statusSelectClasses(projeto.status);

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-8 w-full overflow-hidden">
        {/* ===== Header ===== */}
        <header className="w-full bg-primary-800 border border-primary-700 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4">
            {/* Esquerda: Botão Voltar + Avatar + Títulos */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/projetos")}
                className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[16px] hover:bg-primary-700 transition-colors"
              >
                ← Voltar
              </button>

              <div className="w-[70px] h-[70px] rounded-full overflow-hidden border border-primary-600">
                <Image src="/perfil.svg" alt="Avatar" width={70} height={70} className="object-contain p-2" />
              </div>

              <div className="flex flex-col">
                <h1 className="text-[28px] text-primary-100 font-semibold">{projeto.titulo}</h1>
                <div className="text-[18px] text-gray-300">
                  <span className="text-gray-300">Cliente:</span>{" "}
                  <span className="text-primary-100 font-medium">{clienteNome}</span>
                </div>
              </div>
            </div>

            {/* Direita: status (colorido) + prazo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={projeto.status}
                  onChange={(e) => setStatusManually(e.target.value as Projeto["status"])}
                  className={`appearance-none font-medium rounded-lg pl-4 pr-10 py-2 border ${selectColor.select}`}
                  disabled={saving}
                >
                  <option value="Em andamento">Ativo</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
                {/* Chevron */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${selectColor.chevron}`}
                >
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
                </svg>
              </div>

              <div className="inline-flex items-center text-[14px] text-gray-300 bg-primary-700 border border-primary-600 rounded-lg px-4 py-2">
                {projeto.prazo_entrega
                  ? `Prazo: ${new Date(projeto.prazo_entrega).toLocaleDateString("pt-BR")}`
                  : "Prazo: —"}
              </div>
            </div>
          </div>

          {/* Barra de progresso principal */}
          <div className="mt-5">
            <div className="w-full h-4 bg-primary-700 border border-primary-600 rounded-full overflow-hidden">
              <div className={`h-full ${styles.barFill} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-[14px] text-gray-300">{pct}% concluído</div>
          </div>
        </header>

        {/* ===== Conteúdo ===== */}
        <div className="grid grid-cols-[1.4fr,0.6fr] gap-6 flex-1 min-h-0">
          {/* ===== Coluna esquerda: Tasks ===== */}
          <section className="flex flex-col min-h-0 bg-primary-800 border border-primary-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[22px] text-primary-100 font-semibold">Etapas do projeto</h2>
            </div>

            {/* Criar task */}
            <form
              onSubmit={handleAddTask}
              className="grid grid-cols-1 xl:grid-cols-[1fr,0.6fr,0.4fr,auto] gap-3 mb-5"
            >
              <input
                type="text"
                value={newTask.titulo}
                onChange={(e) => setNewTask((p) => ({ ...p, titulo: e.target.value }))}
                className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400"
                placeholder="Título da task *"
                required
              />
              <input
                type="text"
                value={newTask.descricao}
                onChange={(e) => setNewTask((p) => ({ ...p, descricao: e.target.value }))}
                className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400"
                placeholder="Descrição (opcional)"
              />
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
                className="date-input rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                placeholder="Prazo"
              />
              <button
                type="submit"
                disabled={saving}
                className={`bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-5 text-[18px] font-semibold transition-colors ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                + Nova task
              </button>
            </form>

            {/* Lista de tasks */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              {tasks.length === 0 ? (
                <div className="text-gray-400">Nenhuma task criada ainda.</div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {tasks.map((t) => {
                    const subs = subtasksByTask[t.id] || [];
                    const expanded = !!expandedTasks[t.id];

                    return (
                      <li key={t.id} className="bg-primary-700 border border-primary-600 rounded-lg p-4">
                        {/* Linha principal da task */}
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={t.concluida}
                            onChange={() => toggleTask(t)}
                            className="mt-1 w-5 h-5 accent-primary-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(t.id)}
                                  className="text-gray-300 hover:text-primary-300"
                                  title={expanded ? "Recolher subtasks" : "Expandir subtasks"}
                                >
                                  {expanded ? "▾" : "▸"}
                                </button>
                                <div
                                  className={`text-[16px] ${
                                    t.concluida ? "line-through text-gray-400" : "text-gray-100"
                                  } font-medium`}
                                >
                                  {t.titulo}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-[12px] text-gray-300 bg-primary-800 border border-primary-600 rounded-md px-2 py-1">
                                  {t.due_date
                                    ? `Prazo: ${new Date(t.due_date).toLocaleDateString("pt-BR")}`
                                    : "Sem prazo"}
                                </div>
                                <button
                                  onClick={() => openEditTask(t)}
                                  className="text-[14px] text-primary-200 hover:text-primary-100"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => askRemoveTask(t)}
                                  className="text-[14px] text-red-400 hover:text-red-300"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                            {t.descricao ? (
                              <div className="text-[14px] text-gray-300 mt-1">{t.descricao}</div>
                            ) : null}
                          </div>
                        </div>

                        {/* Subtasks sanfona */}
                        {expanded && (
                          <div className="mt-3 pl-7">
                            {subs.length === 0 ? (
                              <div className="text-gray-400 text-[14px]">Sem subtasks.</div>
                            ) : (
                              <ul className="flex flex-col gap-2">
                                {subs.map((s) => (
                                  <li
                                    key={s.id}
                                    className="flex items-center justify-between bg-primary-800 border border-primary-600 rounded-lg px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={s.concluida}
                                        onChange={() => toggleSubtask(t.id, s)}
                                        className="w-4 h-4 accent-primary-500"
                                      />
                                      <span
                                        className={`text-[14px] ${
                                          s.concluida ? "line-through text-gray-400" : "text-gray-100"
                                        }`}
                                      >
                                        {s.titulo}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => askRemoveSubtask(t.id, s)}
                                      className="text-[12px] text-red-400 hover:text-red-300"
                                    >
                                      Remover
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Adicionar subtask */}
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={newSubtaskByTask[t.id] || ""}
                                onChange={(e) =>
                                  setNewSubtaskByTask((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                                className="flex-1 rounded-lg bg-primary-900 border border-primary-700 px-3 py-2 text-gray-100 placeholder-gray-400"
                                placeholder="Nova subtask"
                              />
                              <button
                                onClick={() => addSubtask(t.id)}
                                className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors"
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Barra de progresso secundária */}
            <div className="mt-5">
              <div className="w-full h-3 bg-primary-700 border border-primary-600 rounded-full overflow-hidden">
                <div className={`h-full ${styles.barFill} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </section>

          {/* ===== Coluna direita: Briefing + Arquivos + Links ===== */}
          <section className="flex flex-col gap-6 min-h-0">
            {/* Briefing */}
            <div className="bg-primary-800 border border-primary-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[20px] text-primary-100 font-semibold">Briefing</h3>
                <button
                  onClick={() => setShowBriefing(true)}
                  className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[16px] hover:bg-primary-700 transition-colors"
                >
                  Ver briefing
                </button>
              </div>
              <p className="text-[14px] text-gray-300">
                Acesse as respostas do briefing deste projeto para guiar seu desenvolvimento.
              </p>
            </div>

            {/* Arquivos */}
            <div className="bg-primary-800 border border-primary-700 rounded-lg p-6 flex flex-col min-h-0">
              <h3 className="text-[20px] text-primary-100 font-semibold mb-3">Arquivos</h3>

              <label className="w-full rounded-lg border border-dashed border-primary-600 bg-primary-900 px-4 py-6 text-center cursor-pointer hover:bg-primary-800 transition">
                <span className="text-[16px] text-gray-300">
                  Arraste aqui ou <span className="text-primary-300">clique para enviar</span>
                </span>
                <input type="file" accept="*/*" className="hidden" onChange={handleUpload} />
              </label>

              <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                {files.length === 0 ? (
                  <div className="text-gray-400">Nenhum arquivo enviado.</div>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between bg-primary-700 border border-primary-600 rounded-lg px-4 py-3"
                      >
                        <div className="flex flex-col">
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[16px] text-primary-100 hover:underline"
                          >
                            {f.nome}
                          </a>
                          <span className="text-[12px] text-gray-400">
                            {new Date(f.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-md text-[12px] ${
                            f.status === "aprovado"
                              ? "bg-third-400 text-primary-100"
                              : "bg-primary-500 text-primary-100"
                          }`}
                        >
                          {f.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Links externos */}
            <div className="bg-primary-800 border border-primary-700 rounded-lg p-6 flex flex-col min-h-0">
              <h3 className="text-[20px] text-primary-100 font-semibold mb-3">Links</h3>

              <form onSubmit={addLink} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Título (opcional)"
                  value={newLink.titulo}
                  onChange={(e) => setNewLink((p) => ({ ...p, titulo: e.target.value }))}
                  className="flex-1 rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))}
                  required
                  className="flex-[1.4] rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-4 py-3 text-[16px] font-semibold transition-colors"
                >
                  Adicionar
                </button>
              </form>

              <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                {links.length === 0 ? (
                  <div className="text-gray-400">Nenhum link adicionado.</div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {links.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between bg-primary-700 border border-primary-600 rounded-lg px-4 py-3"
                      >
                        <div className="flex flex-col">
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[16px] text-primary-100 hover:underline"
                          >
                            {l.titulo || l.url}
                          </a>
                          <span className="text-[12px] text-gray-400">
                            {new Date(l.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {/* Botão de remover link pode ser adicionado aqui se desejar */}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ===== Modal Briefing ===== */}
      <Modal open={showBriefing} title="Briefing do projeto" onClose={() => setShowBriefing(false)}>
        {!briefing ? (
          <div className="text-gray-400">Nenhum briefing vinculado a este projeto.</div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {renderBriefing(briefing.respostas)}
          </div>
        )}
      </Modal>

      {/* ===== Modal Editar Task ===== */}
      <Modal
        open={!!editTask}
        title="Editar task"
        onClose={() => setEditTask(null)}
        actions={
          <>
            <button
              onClick={() => setEditTask(null)}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[16px] hover:bg-primary-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveEditTask}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-4 py-2 text-[16px] font-semibold transition-colors"
              disabled={saving}
            >
              Salvar
            </button>
          </>
        }
      >
        {editTask && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={editTask.titulo}
              onChange={(e) => setEditTask({ ...editTask, titulo: e.target.value })}
              className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400"
              placeholder="Título"
            />
            <textarea
              value={editTask.descricao || ""}
              onChange={(e) => setEditTask({ ...editTask, descricao: e.target.value })}
              className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400 resize-none"
              rows={3}
              placeholder="Descrição"
            />
            <input
              type="date"
              value={editTask.due_date || ""}
              onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })}
              className="date-input rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
            />
          </div>
        )}
      </Modal>

      {/* ===== Modal Confirm ===== */}
      <Modal
        open={confirm.open}
        title="Confirmar ação"
        onClose={() => setConfirm({ open: false, msg: "" })}
        actions={
          <>
            <button
              onClick={() => setConfirm({ open: false, msg: "" })}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[16px] hover:bg-primary-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (confirm.onYes) confirm.onYes();
              }}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-4 py-2 text-[16px] font-semibold transition-colors"
            >
              Confirmar
            </button>
          </>
        }
      >
        <p className="text-[16px]">{confirm.msg}</p>
      </Modal>

      {/* ===== Modal Notify ===== */}
      <Modal
        open={notify.open}
        onClose={() => setNotify({ open: false, msg: "" })}
        actions={
          <button
            onClick={() => setNotify({ open: false, msg: "" })}
            className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-4 py-2 text-[16px] font-semibold transition-colors"
          >
            OK
          </button>
        }
      >
        <p className="text-[16px]">{notify.msg}</p>
      </Modal>

      {/* Scrollbar + ícone do calendário personalizados */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-500);
          border-radius: 9999px;
          border: 2px solid var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-400);
        }
        /* Deixa o ícone do calendário claro no tema escuro */
        .date-input::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
    </div>
  );
}