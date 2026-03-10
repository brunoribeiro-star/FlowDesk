"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { validateImageFile } from "@/lib/utils";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import { Pencil, SlidersHorizontal, Crown, ChevronDown, ChevronUp, Link2, ClipboardList, Timer } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import HeaderProfile from "@/components/HeaderProfile";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList, SkeletonStatCard } from "@/components/Skeleton";

type ProjetoStatus = "Em andamento" | "Concluído" | "Arquivado";

type Projeto = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: any;
  cover_url: string | null;
  cliente_id: string | null;
  orcamento: number | null;
  data_inicio: string | null;
  prazo_entrega: string | null;
  status: ProjetoStatus;
  progresso: number | null;
  link_arquivos: string | null;
  etapa_atual: string | null;
  notas_internas: string | null;
  created_at: string;
  updated_at: string;
  clientes?: {
    id: string;
    nome: string | null;
    empresa: string | null;
    foto_url: string | null;
  } | null;
};

type Task = {
  id: string;
  projeto_id: string | null;
  titulo: string;
  descricao: any;
  status?: string | null;
  concluida?: boolean | null;
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

type BriefingEnvio = {
  id: string;
  user_id: string;
  template_id: string;
  projeto_id: string | null;
  status: string;
  prazo_resposta: string | null;
  created_at: string;
  template?: { id: string; titulo: string } | null;
};

type TabId = "descricao" | "etapas" | "arquivos" | "links" | "briefing";

function safeParseJSON(value: any) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function calcularUrgencia(data: string | null): string {
  if (!data) return "Sem prioridade";
  const hoje = new Date();
  const limite = new Date(data + "T00:00:00");
  const diff = limite.getTime() - hoje.getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  if (dias < 0) return "Vencida";
  if (dias <= 1) return "Muito urgente";
  if (dias <= 2) return "Urgente";
  if (dias <= 7) return "Normal";
  return "Baixa";
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
      break;
  }
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${i < ativos ? "bg-primary-500" : "bg-primary-700"}`}
          style={{ height: 6 + i * 3 }}
        />
      ))}
    </div>
  );
}

function timeAgoPtBR(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - d.getTime());
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years > 1 ? "s" : ""}`;
}

function statusLabel(status: ProjetoStatus) {
  if (status === "Em andamento") return "Para fazer";
  return status;
}

function statusPillClass(status: ProjetoStatus) {
  if (status === "Concluído") return "bg-third-400/15 text-third-300 border-third-400/40";
  if (status === "Arquivado") return "bg-gray-500/15 text-gray-200 border-gray-400/30";
  return "bg-primary-500/15 text-primary-200 border-primary-500/35";
}

function Modal({
  open,
  title,
  children,
  onClose,
  actions,
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[18px] text-primary-100 font-semibold">{title}</h4>
            <button onClick={onClose} className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-3 py-1 hover:bg-primary-700">
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
  const idRaw = router.query?.id;
  const id = typeof idRaw === "string" ? idRaw : "";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>({});
  const [files, setFiles] = useState<ArquivoProjeto[]>([]);
  const [links, setLinks] = useState<LinkProjeto[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string | null; empresa: string | null }[]>([]);

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newLink, setNewLink] = useState({ titulo: "", url: "" });
  const [notify, setNotify] = useState<{ open: boolean; msg: string }>({ open: false, msg: "" });

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [activeTab, setActiveTab] = useState<TabId>("descricao");

  const { user: authUser } = useAuth();
  const [user, setUser] = useState<any>(null);


  const [coverUploading, setCoverUploading] = useState(false);
  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [briefingEnvios, setBriefingEnvios] = useState<BriefingEnvio[]>([]);
  const [attachBriefingOpen, setAttachBriefingOpen] = useState(false);
  const [attachingBriefing, setAttachingBriefing] = useState(false);

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editForm, setEditForm] = useState({
    titulo: "",
    status: "Em andamento" as ProjetoStatus,
    cliente_id: "" as string | null,
    orcamento: "",
    prazo_entrega: "",
  });

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkData, setEditingLinkData] = useState({ titulo: "", url: "" });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editable: true,
    autofocus: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const parsed = safeParseJSON(projeto?.descricao);
    if (parsed) editor.commands.setContent(parsed);
    else editor.commands.clearContent();
  }, [editor, projeto?.descricao]);

  useEffect(() => {
    if (!id || !router.isReady || !authUser) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        if (cancelled) return;
        setUser(authUser);

        const [
          { data: projetoData, error: projetoErr },
          { data: tasksData, error: tasksErr },
          { data: filesData, error: filesErr },
          { data: linksData, error: linksErr },
          { data: briefData, error: briefErr },
          { data: envsData },
          { data: clientesData },
        ] = await Promise.all([
          supabase
            .from("projetos")
            .select(`*, clientes:cliente_id (id, nome, empresa, foto_url)`)
            .eq("id", id)
            .eq("user_id", authUser.id)
            .single(),
          supabase.from("tasks").select("*").eq("projeto_id", id).order("created_at", { ascending: true }),
          supabase.from("arquivos_projeto").select("*").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("links_projeto").select("*").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("briefings").select("*").eq("projeto_id", id).maybeSingle(),
          supabase.from("briefings_envios").select("id, user_id, template_id, projeto_id, status, prazo_resposta, created_at, template:template_id(id, titulo)").eq("user_id", authUser.id).order("created_at", { ascending: false }),
          supabase.from("clientes").select("id, nome, empresa").eq("user_id", authUser.id).order("nome", { ascending: true }),
        ]);

        if (projetoErr) throw projetoErr;
        if (tasksErr) throw tasksErr;
        if (filesErr) throw filesErr;
        if (linksErr) throw linksErr;
        if (briefErr) throw briefErr;
        if (cancelled) return;

        const proj = projetoData as Projeto;
        setProjeto(proj);

        const tks = (tasksData || []) as Task[];
        setTasks(tks);
        setFiles((filesData || []) as ArquivoProjeto[]);
        setLinks((linksData || []) as LinkProjeto[]);
        setBriefing(briefData ? (briefData as Briefing) : null);
        setBriefingEnvios((envsData || []) as unknown as BriefingEnvio[]);
        setClientes((clientesData || []) as { id: string; nome: string | null; empresa: string | null }[]);

        if (tks.length) {
          const taskIds = tks.map((t) => t.id);
          const { data: subsData, error: subsErr } = await supabase
            .from("subtasks")
            .select("*")
            .in("task_id", taskIds)
            .order("created_at", { ascending: true });

          if (subsErr) throw subsErr;
          if (cancelled) return;

          const grouped: Record<string, Subtask[]> = {};
          (subsData || []).forEach((s: any) => {
            const key = String(s.task_id);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(s as Subtask);
          });
          setSubtasksByTask(grouped);
        } else {
          setSubtasksByTask({});
        }

        setError(null);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar o projeto.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router.isReady, router, authUser]);



  const pct = useMemo(() => {
    const doneTasks = tasks.filter((t) => !!(t.concluida || (t.status || "").toLowerCase() === "concluida")).length;
    const totalTasks = tasks.length;
    if (totalTasks === 0) return 0;

    let subDone = 0;
    let subTotal = 0;

    for (const t of tasks) {
      const subs = subtasksByTask[t.id] || [];
      subDone += subs.filter((s) => s.concluida).length;
      subTotal += subs.length;
    }

    const taskRatio = doneTasks / totalTasks;
    const subRatio = subTotal > 0 ? subDone / subTotal : taskRatio;

    return Math.round(((taskRatio + subRatio) / 2) * 100);
  }, [tasks, subtasksByTask]);

  async function salvarDescricao() {
    if (!projeto || !editor) return;

    try {
      setSaving(true);

      const descricaoJSON = editor.getJSON();

      const { error: updateErr } = await supabase.from("projetos").update({ descricao: descricaoJSON }).eq("id", projeto.id);

      if (updateErr) throw updateErr;

      setProjeto((prev) => (prev ? { ...prev, descricao: descricaoJSON } : prev));

      try {
        await supabase.from("atividades").insert([
          {
            user_id: projeto.user_id,
            projeto_id: projeto.id,
            tipo: "Projetos",
            descricao: "Descrição do projeto atualizada.",
          },
        ]);
      } catch {}

      setNotify({ open: true, msg: "Descrição atualizada com sucesso." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao salvar descrição: " + (err.message || "Erro desconhecido") });
    } finally {
      setSaving(false);
    }
  }

  function openLinkModal() {
    if (!editor) return;
    const attrs = editor.getAttributes("link");
    const currentHref = (attrs?.href as string) || "";
    setLinkUrl(currentHref);
    setLinkModalOpen(true);
  }

  function handleConfirmLink() {
    if (!editor) return;

    const clean = linkUrl.trim();

    if (!clean) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: clean }).run();
    }

    setLinkModalOpen(false);
  }

  function handleRemoveLink() {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!projeto) return;

    const filesSel = e.target.files;
    if (!filesSel || !filesSel.length) return;

    const { data: auth } = await supabase.auth.getUser();
    const authUser = auth?.user;

    if (!authUser) {
      setNotify({ open: true, msg: "Usuário não autenticado." });
      return;
    }

    const file = filesSel[0];
    const filePath = `${authUser.id}/${projeto.id}/${Date.now()}_${file.name}`;

    try {
      setSaving(true);

      const { error: upErr } = await supabase.storage.from("projetos").upload(filePath, file);
      if (upErr) throw upErr;

      const { data: publicUrl } = supabase.storage.from("projetos").getPublicUrl(filePath);

      const { data, error: insErr } = await supabase
        .from("arquivos_projeto")
        .insert([
          {
            projeto_id: projeto.id,
            nome: file.name,
            url: publicUrl.publicUrl,
            status: "pendente",
          },
        ])
        .select()
        .single();

      if (insErr) throw insErr;

      setFiles((prev) => [data as ArquivoProjeto, ...prev]);
      setNotify({ open: true, msg: "Arquivo enviado com sucesso." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao enviar arquivo: " + (err.message || "Erro desconhecido") });
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!projeto) return;

    const filesSel = e.target.files;
    if (!filesSel || !filesSel.length) return;

    const { data: auth } = await supabase.auth.getUser();
    const authUser = auth?.user;

    if (!authUser) {
      setNotify({ open: true, msg: "Usuário não autenticado." });
      return;
    }

    const file = filesSel[0];

    const proceed = async (f: File) => {
      const { data: auth2 } = await supabase.auth.getUser();
      const au = auth2?.user;
      if (!au) { setNotify({ open: true, msg: "Usuário não autenticado." }); return; }

      const ext = (f.name.split(".").pop() || "webp").toLowerCase();
      const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`.replace(".", "");
      const filePath = `${au.id}/${projeto!.id}/${uuid}.${ext}`;

      try {
        setCoverUploading(true);
        const { error: upErr } = await supabase.storage.from("project-covers").upload(filePath, f, { upsert: false, contentType: f.type });
        if (upErr) throw upErr;
        const { data: publicUrl } = supabase.storage.from("project-covers").getPublicUrl(filePath);
        const nextUrl = publicUrl.publicUrl;
        const { error: updErr } = await supabase.from("projetos").update({ cover_url: nextUrl }).eq("id", projeto!.id);
        if (updErr) throw updErr;
        setProjeto((prev) => (prev ? { ...prev, cover_url: nextUrl } : prev));
        setNotify({ open: true, msg: "Capa atualizada com sucesso." });
      } catch (err: any) {
        setNotify({ open: true, msg: "Erro ao enviar capa: " + (err.message || "Erro desconhecido") });
      } finally {
        setCoverUploading(false);
        e.target.value = "";
      }
    };

    triggerConverter(file, IMAGE_SPECS.card, proceed);
    e.target.value = "";
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!projeto) return;

    const url = newLink.url.trim();
    if (!url) return;

    try {
      const { data, error } = await supabase
        .from("links_projeto")
        .insert([{ projeto_id: projeto.id, titulo: newLink.titulo.trim() || null, url }])
        .select()
        .single();

      if (error) throw error;

      setLinks((prev) => [data as LinkProjeto, ...prev]);
      setNewLink({ titulo: "", url: "" });
      setNotify({ open: true, msg: "Link adicionado." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao adicionar link: " + (err.message || "Erro desconhecido") });
    }
  }

  function renderBriefing(respostas: any) {
    if (!respostas) return <div className="text-gray-400">Nenhum briefing preenchido.</div>;

    if (Array.isArray(respostas)) {
      return (
        <ul className="flex flex-col gap-2">
          {respostas.map((item, idx) => (
            <li key={idx} className="bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3">
              <div className="text-primary-100 font-medium">{item?.pergunta ?? `Pergunta ${idx + 1}`}</div>
              <div className="text-gray-300">{item?.resposta ?? "—"}</div>
            </li>
          ))}
        </ul>
      );
    }

    if (typeof respostas === "object") {
      return (
        <ul className="flex flex-col gap-2">
          {Object.entries(respostas).map(([pergunta, resposta], idx) => (
            <li key={idx} className="bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3">
              <div className="text-primary-100 font-medium">{pergunta}</div>
              <div className="text-gray-300">{String(resposta)}</div>
            </li>
          ))}
        </ul>
      );
    }

    return <div className="text-gray-300 whitespace-pre-wrap">{String(respostas)}</div>;
  }

  function isTaskDone(t: Task) {
    return !!(t.concluida || (t.status || "").toLowerCase() === "concluida");
  }

  async function toggleTaskCompletion(task: Task) {
    const done = isTaskDone(task);
    const novoStatus = done ? "para_fazer" : "concluida";

    try {
      const { error } = await supabase.from("tasks").update({ status: novoStatus, concluida: novoStatus === "concluida" }).eq("id", task.id);
      if (error) throw error;

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: novoStatus, concluida: novoStatus === "concluida" } : t)));
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao atualizar tarefa: " + (err.message || "Erro desconhecido") });
    }
  }

  async function toggleSubtaskCompletion(sub: Subtask) {
    const nova = !sub.concluida;
    try {
      const { error } = await supabase.from("subtasks").update({ concluida: nova }).eq("id", sub.id);
      if (error) throw error;

      setSubtasksByTask((prev) => {
        const current = prev[sub.task_id] || [];
        const updated = current.map((s) => (s.id === sub.id ? { ...s, concluida: nova } : s));
        return { ...prev, [sub.task_id]: updated };
      });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao atualizar subtask: " + (err.message || "Erro desconhecido") });
    }
  }

  function toggleTaskExpanded(taskId: string) {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }


  async function handleAttachBriefing(envioId: string) {
    if (!projeto) return;
    setAttachingBriefing(true);
    try {
      const { error: updErr } = await supabase
        .from("briefings_envios")
        .update({ projeto_id: projeto.id })
        .eq("id", envioId);
      if (updErr) throw updErr;

      const { data: rData } = await supabase
        .from("briefings_respostas")
        .select("*")
        .eq("envio_id", envioId)
        .order("created_at", { ascending: true });

      const respostas = (rData || []).map((r: any) => ({
        pergunta: r.campo_label || r.campo_id || "Campo",
        resposta: r.valor ?? "—",
      }));

      const { data: bData, error: bErr } = await supabase
        .from("briefings")
        .upsert([{ projeto_id: projeto.id, respostas }], { onConflict: "projeto_id" })
        .select()
        .single();
      if (bErr) throw bErr;

      setBriefing(bData as Briefing);
      setBriefingEnvios(prev => prev.map(e => e.id === envioId ? { ...e, projeto_id: projeto.id } : e));
      setAttachBriefingOpen(false);
      setNotify({ open: true, msg: "Briefing vinculado com sucesso!" });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao vincular briefing: " + (err.message || "Erro desconhecido") });
    } finally {
      setAttachingBriefing(false);
    }
  }

  function openEditHeader() {
    if (!projeto) return;
    setEditForm({
      titulo: projeto.titulo,
      status: projeto.status,
      cliente_id: projeto.cliente_id,
      orcamento: projeto.orcamento != null ? String(projeto.orcamento) : "",
      prazo_entrega: projeto.prazo_entrega || "",
    });
    setIsEditingHeader(true);
  }

  async function salvarEdicaoHeader() {
    if (!projeto) return;
    try {
      setSaving(true);
      const updates: any = {
        titulo: editForm.titulo.trim() || projeto.titulo,
        status: editForm.status,
        cliente_id: editForm.cliente_id || null,
        orcamento: editForm.orcamento ? Number(editForm.orcamento) : null,
        prazo_entrega: editForm.prazo_entrega || null,
      };
      const { error: updErr } = await supabase.from("projetos").update(updates).eq("id", projeto.id);
      if (updErr) throw updErr;

      const { data: updatedProjeto } = await supabase
        .from("projetos")
        .select(`*, clientes:cliente_id (id, nome, empresa, foto_url)`)
        .eq("id", projeto.id)
        .single();

      if (updatedProjeto) setProjeto(updatedProjeto as Projeto);
      setIsEditingHeader(false);
      setNotify({ open: true, msg: "Projeto atualizado com sucesso!" });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao salvar: " + (err.message || "Erro desconhecido") });
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(linkId: string) {
    try {
      const { error } = await supabase.from("links_projeto").delete().eq("id", linkId);
      if (error) throw error;
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setNotify({ open: true, msg: "Link removido." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao remover link: " + (err.message || "Erro desconhecido") });
    }
  }

  async function saveEditingLink() {
    if (!editingLinkId) return;
    const url = editingLinkData.url.trim();
    if (!url) return;
    try {
      const { error } = await supabase
        .from("links_projeto")
        .update({ titulo: editingLinkData.titulo.trim() || null, url })
        .eq("id", editingLinkId);
      if (error) throw error;
      setLinks((prev) =>
        prev.map((l) =>
          l.id === editingLinkId
            ? { ...l, titulo: editingLinkData.titulo.trim() || null, url }
            : l
        )
      );
      setEditingLinkId(null);
      setNotify({ open: true, msg: "Link atualizado." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao atualizar link: " + (err.message || "Erro desconhecido") });
    }
  }


  if (loading) {
    return <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center">Carregando…</div>;
  }

  if (error || !projeto) {
    return <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center">{error || "Projeto não encontrado."}</div>;
  }

  const clienteNome = projeto.clientes?.nome || "Cliente não informado";
  const clienteEmpresa = projeto.clientes?.empresa || "";
  const clienteFoto = projeto.clientes?.foto_url || "/perfil.svg";

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const displayName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";

  const coverSrc = projeto.cover_url || "/project-cover-placeholder.png";

  const urgProjeto = calcularUrgencia(projeto.prazo_entrega);
  const createdLabel = projeto.created_at ? timeAgoPtBR(projeto.created_at) : "—";

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 pr-6 py-8 w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/dashboard/projetos")}
            className="inline-flex items-center gap-2 bg-primary-800 border border-primary-700 text-gray-100 rounded-xl px-4 py-2 text-[15px] hover:bg-primary-700 transition-colors"
          >
            ← Voltar
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/projetos/cronometro?projeto_id=${id}`)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-all shadow-lg shadow-primary-500/20"
              title="Iniciar cronômetro do projeto"
            >
              <Timer size={18} />
            </button>
            <label className="w-10 h-10 rounded-full bg-primary-800 border border-primary-700 hover:bg-primary-700 transition-colors cursor-pointer flex items-center justify-center">
              <span className="text-[18px]">{coverUploading ? "…" : "⤴"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} disabled={coverUploading} />
            </label>

            <HeaderProfile />
          </div>
        </div>

        <div className="mt-6 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="w-full max-w-[980px] mx-auto">
            <div className="bg-primary-800 border border-primary-700 rounded-3xl p-6">
              {isEditingHeader ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[16px] text-primary-100 font-semibold">Editar projeto</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingHeader(false)}
                        className="px-4 py-1.5 rounded-xl bg-primary-900 border border-primary-700 text-gray-200 text-[14px] hover:bg-primary-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={salvarEdicaoHeader}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[14px] transition-colors disabled:opacity-60"
                      >
                        {saving ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] text-gray-400">Título</span>
                      <input
                        type="text"
                        value={editForm.titulo}
                        onChange={(e) => setEditForm((p) => ({ ...p, titulo: e.target.value }))}
                        className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-2 text-[15px] text-gray-100 focus:outline-none focus:border-primary-500"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] text-gray-400">Status</span>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as ProjetoStatus }))}
                        className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-2 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500 cursor-pointer"
                      >
                        <option value="Em andamento">Em andamento</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Arquivado">Arquivado</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] text-gray-400">Cliente</span>
                      <select
                        value={editForm.cliente_id ?? ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, cliente_id: e.target.value || null }))}
                        className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-2 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500 cursor-pointer"
                      >
                        <option value="">Nenhum cliente</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}{c.empresa ? ` - ${c.empresa}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] text-gray-400">Orçamento (R$)</span>
                      <input
                        type="number"
                        value={editForm.orcamento}
                        onChange={(e) => setEditForm((p) => ({ ...p, orcamento: e.target.value }))}
                        className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-2 text-[15px] text-gray-100 focus:outline-none focus:border-primary-500"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] text-gray-400">Prazo de entrega</span>
                      <DatePicker
                        value={editForm.prazo_entrega}
                        onChange={(v) => setEditForm((p) => ({ ...p, prazo_entrega: v }))}
                        placeholder="dd/mm/aaaa"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-[160px] h-[72px] rounded-[28px] overflow-hidden border border-primary-700 bg-primary-900 shrink-0">
                      <Image src={coverSrc} alt="Capa do projeto" width={320} height={144} className="w-full h-full object-cover" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h1 className="text-[22px] md:text-[24px] text-gray-100 font-semibold leading-tight truncate">{projeto.titulo}</h1>
                        <span className={`hidden md:inline-flex items-center px-3 py-1 rounded-full text-[12px] border ${statusPillClass(projeto.status)}`}>
                          {statusLabel(projeto.status)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[14px] text-gray-300">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-primary-700 bg-primary-900">
                            <Image src={clienteFoto} alt={clienteNome} width={28} height={28} className="w-full h-full object-cover" />
                          </div>
                          <span className="truncate">
                            <span className="text-gray-300">Cliente: </span>
                            <span className="text-primary-100 font-medium">{clienteNome}</span>
                            {clienteEmpresa ? <span className="text-gray-400"> · {clienteEmpresa}</span> : null}
                          </span>
                        </div>

                        <span className={`md:hidden inline-flex items-center px-3 py-1 rounded-full text-[12px] border ${statusPillClass(projeto.status)}`}>
                          {statusLabel(projeto.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <button
                      type="button"
                      onClick={openEditHeader}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-700 border border-primary-600 text-gray-200 text-[13px] hover:bg-primary-600 transition-colors"
                    >
                      <Pencil size={14} />
                      Editar projeto
                    </button>
                    <div className="w-full md:w-[360px]">
                      <div className="w-full h-2.5 bg-primary-900/60 border border-primary-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-400 transition-[width] duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-2 text-[13px] text-gray-300">{pct}% concluído</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-primary-700">
                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Valor</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">
                      {projeto.orcamento
                        ? projeto.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Entrega</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">
                      {projeto.prazo_entrega ? new Date(projeto.prazo_entrega + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Urgência</div>
                    <div className="mt-1 flex items-center gap-2">
                      <UrgenciaIndicator nivel={urgProjeto} />
                      <span className="text-[14px] text-gray-100">{urgProjeto}</span>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Criação</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">{createdLabel}</div>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-6 bg-primary-800 border border-primary-700 rounded-3xl p-5 flex flex-col overflow-hidden min-h-[560px]">
              <div className="flex flex-wrap gap-2 border-b border-primary-700 pb-3 mb-4">
                {([
                  ["descricao", "Descrição"],
                  ["etapas", "Etapas"],
                  ["arquivos", "Arquivos"],
                  ["links", "Links"],
                  ["briefing", "Briefing"],
                ] as Array<[TabId, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 rounded-full text-[14px] font-medium transition-colors ${
                      activeTab === key ? "bg-primary-500 text-primary-900" : "bg-primary-900 text-gray-200 border border-primary-700 hover:bg-primary-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "descricao" && (
                  <div className="flex flex-col h-full">
                    <h2 className="text-[20px] text-primary-100 font-semibold mb-4">Descrição do projeto</h2>

                    <div className="bg-primary-900 border border-primary-700 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[220px]">
                      {editor && <EditorToolbar editor={editor} onOpenLinkModal={openLinkModal} onRemoveLink={handleRemoveLink} />}

                      <div className="border-t border-primary-700 flex-1 min-h-0">
                        <EditorContent
                          editor={editor}
                          className="tiptap px-4 py-3 text-[15px] text-gray-100 max-h-full h-full overflow-y-auto custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={salvarDescricao}
                        disabled={saving}
                        className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {saving ? "Salvando..." : "Salvar descrição"}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "etapas" && (
                  <div className="flex flex-col h-full">
                    <h2 className="text-[20px] text-primary-100 font-semibold mb-4">Etapas do projeto</h2>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {tasks.length === 0 ? (
                        <div className="text-gray-400">Nenhuma task criada ainda.</div>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {tasks.map((t) => {
                            const subs = subtasksByTask[t.id] || [];
                            const done = isTaskDone(t);
                            const urgencia = calcularUrgencia(t.due_date);

                            return (
                              <li key={t.id} className="bg-primary-900/60 border border-primary-700 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskCompletion(t)}
                                    className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                      done
                                        ? "bg-primary-500 border-primary-500 text-white"
                                        : "border-gray-500 hover:border-gray-300"
                                    }`}
                                  >
                                    {done && (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </button>

                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className={`text-gray-100 text-[16px] font-medium ${done ? "line-through text-gray-400" : ""}`}>{t.titulo}</div>

                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-primary-800 border border-primary-700 rounded-full px-3 py-1">
                                          <UrgenciaIndicator nivel={urgencia} />
                                          <span className="text-[12px] text-gray-100">{urgencia}</span>
                                        </div>
                                        {t.due_date && (
                                          <div className="text-[12px] text-gray-200 bg-primary-800 border border-primary-700 rounded-full px-3 py-1">
                                            {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {subs.length > 0 && (
                                      <div className="mt-3 pl-1 flex flex-col gap-2">
                                        {subs.map((s) => (
                                          <div key={s.id} className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleSubtaskCompletion(s)}
                                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                                s.concluida
                                                  ? "bg-primary-500 border-primary-500 text-white"
                                                  : "border-gray-500 hover:border-gray-300"
                                              }`}
                                            >
                                              {s.concluida && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                              )}
                                            </button>
                                            <span className={`text-[14px] ${s.concluida ? "line-through text-gray-500" : "text-gray-300"}`}>{s.titulo}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}



                {activeTab === "arquivos" && (
                  <div className="flex flex-col h-full">
                    <h3 className="text-[20px] text-primary-100 font-semibold mb-3">Arquivos</h3>

                    <label className="w-full rounded-2xl border border-dashed border-primary-600 bg-primary-900 px-4 py-6 text-center cursor-pointer hover:bg-primary-800 transition">
                      <span className="text-[16px] text-gray-300">
                        Arraste aqui ou <span className="text-primary-300">clique para enviar</span>
                      </span>
                      <input type="file" className="hidden" onChange={handleUpload} />
                    </label>

                    <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {files.length === 0 ? (
                        <div className="text-gray-400">Nenhum arquivo enviado.</div>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {files.map((f) => (
                            <li key={f.id} className="flex items-center justify-between bg-primary-900/60 border border-primary-700 rounded-2xl px-4 py-3">
                              <div className="flex flex-col">
                                <a href={f.url} target="_blank" rel="noreferrer" className="text-[16px] text-primary-100 hover:underline">
                                  {f.nome}
                                </a>
                                <span className="text-[12px] text-gray-400">{new Date(f.created_at).toLocaleString("pt-BR")}</span>
                              </div>

                              <span className={`px-3 py-1 rounded-full text-[12px] ${f.status === "aprovado" ? "bg-third-400 text-primary-900" : "bg-primary-500 text-primary-100"}`}>
                                {f.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "links" && (
                  <div className="flex flex-col h-full">
                    <h3 className="text-[20px] text-primary-100 font-semibold mb-3">Links</h3>

                    <form onSubmit={addLink} className="flex flex-col md:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Título (opcional)"
                        value={newLink.titulo}
                        onChange={(e) => setNewLink((p) => ({ ...p, titulo: e.target.value }))}
                        className="flex-1 rounded-xl bg-primary-900 border border-primary-700 px-4 py-2 text-gray-100 placeholder-gray-400"
                      />

                      <input
                        type="url"
                        placeholder="https://..."
                        required
                        value={newLink.url}
                        onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))}
                        className="flex-[1.4] rounded-xl bg-primary-900 border border-primary-700 px-4 py-2 text-gray-100 placeholder-gray-400"
                      />

                      <button type="submit" className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors">
                        Adicionar
                      </button>
                    </form>

                    <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {projeto.link_arquivos && (
                        <div className="mb-3 flex items-center gap-2 bg-primary-900/60 border border-primary-600/40 rounded-2xl px-4 py-3">
                          <Link2 size={15} className="text-primary-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <a
                              href={projeto.link_arquivos.startsWith("http") ? projeto.link_arquivos : `https://${projeto.link_arquivos}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[15px] text-primary-300 hover:underline truncate"
                            >
                              {projeto.link_arquivos}
                            </a>
                            <span className="text-[11px] text-gray-500">Link do projeto (cadastro)</span>
                          </div>
                        </div>
                      )}

                      {links.length === 0 && !projeto.link_arquivos ? (
                        <div className="text-gray-400">Nenhum link adicionado.</div>
                      ) : links.length === 0 ? null : (
                        <ul className="flex flex-col gap-2">
                          {links.map((l) => (
                            <li key={l.id} className="bg-primary-900/60 border border-primary-700 rounded-2xl px-4 py-3">
                              {editingLinkId === l.id ? (
                                <div className="flex flex-col gap-2">
                                  <input
                                    type="text"
                                    placeholder="Título (opcional)"
                                    value={editingLinkData.titulo}
                                    onChange={(e) => setEditingLinkData((p) => ({ ...p, titulo: e.target.value }))}
                                    className="w-full bg-primary-800 border border-primary-700 rounded-lg px-3 py-1.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                                  />
                                  <input
                                    type="url"
                                    placeholder="https://..."
                                    value={editingLinkData.url}
                                    onChange={(e) => setEditingLinkData((p) => ({ ...p, url: e.target.value }))}
                                    className="w-full bg-primary-800 border border-primary-700 rounded-lg px-3 py-1.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingLinkId(null)}
                                      className="px-3 py-1 rounded-lg bg-primary-800 border border-primary-700 text-gray-200 text-[13px] hover:bg-primary-700"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveEditingLink}
                                      className="px-3 py-1 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[13px]"
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col min-w-0">
                                    <a href={l.url} target="_blank" rel="noreferrer" className="text-[15px] text-primary-100 hover:underline truncate">
                                      {l.titulo || l.url}
                                    </a>
                                    {l.titulo && (
                                      <span className="text-[12px] text-gray-500 truncate">{l.url}</span>
                                    )}
                                    <span className="text-[11px] text-gray-600">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingLinkId(l.id);
                                        setEditingLinkData({ titulo: l.titulo || "", url: l.url });
                                      }}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-200 hover:bg-primary-800 transition-colors"
                                      title="Editar link"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeLink(l.id)}
                                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-primary-800 transition-colors"
                                      title="Remover link"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "briefing" && (
                  <div className="flex flex-col h-full gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[20px] text-primary-100 font-semibold">Briefing do projeto</h3>
                      <button
                        type="button"
                        onClick={() => setAttachBriefingOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-700 border border-primary-600 text-gray-200 hover:bg-primary-600 transition-colors text-[13px]"
                      >
                        <ClipboardList size={15} />
                        Vincular briefing
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {!briefing
                        ? <div className="text-gray-400">Nenhum briefing vinculado. Clique em “Vincular briefing” para anexar um existente.</div>
                        : <div className="flex flex-col gap-3">{renderBriefing(briefing.respostas)}</div>
                      }
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {attachBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAttachBriefingOpen(false)}>
          <div
            className="w-full max-w-lg bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[18px] text-primary-100 font-semibold">Vincular briefing existente</h4>
              <button onClick={() => setAttachBriefingOpen(false)} className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-3 py-1 hover:bg-primary-700">Fechar</button>
            </div>

            {briefingEnvios.length === 0 ? (
              <p className="text-gray-400 text-[14px]">Nenhum briefing enviado encontrado.</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {briefingEnvios.map(envio => (
                  <li key={envio.id} className="flex items-center justify-between bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[15px] text-gray-100 font-medium">
                        {(envio as any).template?.titulo || "Briefing sem título"}
                      </span>
                      <span className="text-[12px] text-gray-500">
                        {new Date(envio.created_at).toLocaleDateString("pt-BR")} • {envio.status}
                        {envio.projeto_id && envio.projeto_id !== id ? " • Vinculado a outro projeto" : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAttachBriefing(envio.id)}
                      disabled={attachingBriefing}
                      className="ml-3 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-300 text-primary-900 text-[13px] font-semibold transition-colors disabled:opacity-50"
                    >
                      {attachingBriefing ? "..." : "Vincular"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal
        open={notify.open}
        onClose={() => setNotify({ open: false, msg: "" })}
        actions={
          <button onClick={() => setNotify({ open: false, msg: "" })} className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-xl px-4 py-2 text-[16px] font-semibold transition-colors">
            OK
          </button>
        }
      >
        <p className="text-[16px]">{notify.msg}</p>
      </Modal>

      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-primary-800 border border-primary-600 shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6">
            <h2 className="text-[18px] text-gray-100 font-semibold mb-3">Inserir link</h2>
            <p className="text-[14px] text-gray-300 mb-4">Cole a URL que deseja vincular ao texto selecionado.</p>

            <input
              autoFocus
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-primary-900 border border-primary-700 rounded-lg px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 mb-5"
            />

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setLinkModalOpen(false)} className="px-4 py-2 rounded-lg bg-primary-800 border border-primary-600 text-gray-200 text-[14px] hover:bg-primary-700">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmLink} className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[14px]">
                Aplicar link
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
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
        .tiptap {
          min-height: 160px;
          outline: none;
        }
        .tiptap p {
          margin-bottom: 0.4rem;
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
          list-style-type: disc;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }
        .tiptap blockquote {
          border-left: 3px solid rgba(148, 163, 184, 0.8);
          padding-left: 0.75rem;
          margin: 0.5rem 0;
          color: #e5e7eb;
          font-style: italic;
        }
        .tiptap a {
          color: #38bdf8;
          text-decoration: underline;
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {converterState && (
        <ImageConverterModal
          file={converterState.file}
          spec={converterState.spec}
          onAccept={converterState.onAccept}
          onCancel={() => cancelConverter()}
        />
      )}
    </div>
  );
}

function EditorToolbar({
  editor,
  onOpenLinkModal,
  onRemoveLink,
}: {
  editor: Editor;
  onOpenLinkModal: () => void;
  onRemoveLink: () => void;
}) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => forceUpdate((v) => v + 1);

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("update", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("update", update);
    };
  }, [editor]);

  const isActive = (check: () => boolean) => (check() ? "bg-primary-700 text-primary-100" : "text-gray-300");
  const base = "px-2.5 py-1.5 text-[13px] rounded-md border border-transparent hover:bg-primary-800 flex items-center justify-center gap-1";

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : "p";

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary-900/80">
      <select
        value={headingValue}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "h1") editor.chain().focus().setHeading({ level: 1 }).run();
          else if (val === "h2") editor.chain().focus().setHeading({ level: 2 }).run();
          else if (val === "h3") editor.chain().focus().setHeading({ level: 3 }).run();
          else editor.chain().focus().setParagraph().run();
        }}
        className="bg-primary-800 border border-primary-700 rounded-md px-3 pr-7 py-1.5 text-[13px] text-gray-100 cursor-pointer"
      >
        <option value="p">Normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
      </select>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button type="button" className={`${base} ${isActive(() => editor.isActive("bold"))}`} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-semibold">B</span>
      </button>

      <button type="button" className={`${base} ${isActive(() => editor.isActive("italic"))}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </button>

      <button type="button" className={`${base} ${isActive(() => editor.isActive("underline"))}`} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="underline">U</span>
      </button>

      <button type="button" className={`${base} ${isActive(() => editor.isActive("strike"))}`} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button type="button" className={`${base} ${isActive(() => editor.isActive("bulletList"))}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • • •
      </button>

      <button type="button" className={`${base} ${isActive(() => editor.isActive("orderedList"))}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1 2 3
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button type="button" className={`${base} ${isActive(() => editor.isActive("blockquote"))}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        “”
      </button>

      <button type="button" className={`${base} ${isActive(() => editor.isActive("link"))}`} onClick={onOpenLinkModal}>
        🔗
      </button>

      <button type="button" className={base + " text-gray-400 hover:text-primary-100"} onClick={onRemoveLink}>
        Remover
      </button>
    </div>
  );
}

function TaskDescricaoReadonly({ content }: { content: any }) {
  const editor = useEditor({
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
    content: "",
  });

  useEffect(() => {
    if (!editor) return;

    if (!content) {
      editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
      return;
    }

    let parsed: any = content;

    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: content }],
            },
          ],
        };
      }
    }

    editor.commands.setContent(parsed);
  }, [editor, content]);

  if (!editor) return null;

  return <EditorContent editor={editor} className="tiptap text-[14px] text-gray-100" />;
} 