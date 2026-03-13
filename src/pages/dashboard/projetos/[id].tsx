"use client";

import { useCallback, useEffect, memo, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { validateImageFile, calcularUrgencia } from "@/lib/utils";
import UrgenciaIndicator from "@/components/UrgenciaIndicator";
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
  user_id: string | null;
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

type MemberSplit = { project_id: string; member_user_id: string; split_type: string; split_value: number; payment_status?: string; paid_at?: string | null; payment_requested_at?: string | null };
type ProjectMember = { user_id: string; role: string; email?: string | null; nome?: string | null; avatar_url?: string | null };
type PendingInvite = { id: string; invited_email: string; status: string; split_type?: string; split_value?: number };
type CollabPaySplit = { id: string; pagamento_id: string; amount: number; status: string; paid_at?: string };

function isTaskDone(t: Task) {
  return !!(t.concluida || (t.status || "").toLowerCase() === "concluida");
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

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteSplitType, setInviteSplitType] = useState<"percentage" | "fixed">("percentage");
  const [inviteSplitValue, setInviteSplitValue] = useState("");


  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [memberSplits, setMemberSplits] = useState<MemberSplit[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [myCollabSplits, setMyCollabSplits] = useState<CollabPaySplit[]>([]);
  const [mySplit, setMySplit] = useState<MemberSplit | null>(null);
  const [editingSplitMemberId, setEditingSplitMemberId] = useState<string | null>(null);
  const [editSplitType, setEditSplitType] = useState<"percentage" | "fixed">("percentage");
  const [editSplitValue, setEditSplitValue] = useState("");
  const [savingSplit, setSavingSplit] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [inviteAlreadyPaid, setInviteAlreadyPaid] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [markingSplitId, setMarkingSplitId] = useState<string | null>(null);
  const [markingMemberId, setMarkingMemberId] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [ownerCollabSplits, setOwnerCollabSplits] = useState<any[]>([]);

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ titulo: "", due_date: "", assigned_to: "", subtasks: [] as string[] });
  const [addingTask, setAddingTask] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{ nome: string | null; avatar_url: string | null } | null>(null);

  const taskIdsRef = useRef<Set<string>>(new Set());

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
          { data: membersData },
          { data: memberSplitsData },
          { data: pendingInvitesData },
          { data: mySplitData },
          { data: myCollabSplitsData },
          { data: ownerCollabSplitsData },
        ] = await Promise.all([
          supabase
            .from("projetos")
            .select(`*, clientes:cliente_id (id, nome, empresa, email, telefone, foto_url)`)
            .eq("id", id)
            .single(),
          supabase.from("tasks").select("*").eq("projeto_id", id).order("created_at", { ascending: true }),
          supabase.from("arquivos_projeto").select("*").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("links_projeto").select("*").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("briefings").select("*").eq("projeto_id", id).maybeSingle(),
          supabase.from("briefings_envios").select("id, user_id, template_id, projeto_id, status, prazo_resposta, created_at, template:template_id(id, titulo)").eq("user_id", authUser.id).order("created_at", { ascending: false }),
          supabase.from("clientes").select("id, nome, empresa").eq("user_id", authUser.id).order("nome", { ascending: true }),
          supabase.from("project_members").select("user_id, role, email, nome, avatar_url").eq("project_id", id),
          supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, payment_status").eq("project_id", id),
          supabase.from("project_invites").select("id, invited_email, status, split_type, split_value").eq("project_id", id).eq("status", "pending"),
          supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, payment_status, paid_at").eq("project_id", id).eq("member_user_id", authUser.id).maybeSingle(),
          supabase.from("collaborator_payment_splits").select("id, pagamento_id, amount, status, paid_at").eq("project_id", id).eq("member_user_id", authUser.id),
          supabase.from("collaborator_payment_splits").select("id, pagamento_id, member_user_id, amount, status, paid_at").eq("project_id", id),
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
        setMembers((membersData || []) as any[]);
        setMemberSplits((memberSplitsData || []) as any[]);
        setPendingInvites((pendingInvitesData || []) as any[]);
        setMySplit((mySplitData as any) || null);
        setMyCollabSplits((myCollabSplitsData || []) as any[]);
        setOwnerCollabSplits((ownerCollabSplitsData || []) as any[]);

        setError(null);

        // Non-blocking background fetches — not needed for initial render
        if (authUser.id !== proj.user_id) {
          supabase
            .from("users")
            .select("nome, avatar_url")
            .eq("id", proj.user_id)
            .maybeSingle()
            .then(({ data }) => { if (!cancelled) setOwnerProfile(data || null); });
        }

        if (tks.length) {
          const taskIds = tks.map((t) => t.id);
          supabase
            .from("subtasks")
            .select("*")
            .in("task_id", taskIds)
            .order("created_at", { ascending: true })
            .then(({ data: subsData, error: subsErr }) => {
              if (subsErr || cancelled) return;
              const grouped: Record<string, Subtask[]> = {};
              (subsData || []).forEach((s: any) => {
                const key = String(s.task_id);
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(s as Subtask);
              });
              setSubtasksByTask(grouped);
            });
        } else {
          setSubtasksByTask({});
        }
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

  useEffect(() => {
    if (!id || !router.isReady || !authUser) return;

    const refetchSplits = () => {
      supabase.from("collaborator_payment_splits").select("id, pagamento_id, amount, status, paid_at").eq("project_id", id).eq("member_user_id", authUser.id)
        .then(({ data }) => { if (data) setMyCollabSplits(data as any[]); });
      supabase.from("collaborator_payment_splits").select("id, pagamento_id, member_user_id, amount, status, paid_at").eq("project_id", id)
        .then(({ data }) => { if (data) setOwnerCollabSplits(data as any[]); });
    };

    const refetchMemberSplits = () => {
      supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, payment_status").eq("project_id", id)
        .then(({ data }) => { if (data) setMemberSplits(data as any[]); });
      supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, payment_status, paid_at").eq("project_id", id).eq("member_user_id", authUser.id).maybeSingle()
        .then(({ data }) => { setMySplit((data as any) || null); });
    };

    const refetchProjeto = () => {
      supabase.from("projetos").select(`*, clientes:cliente_id (id, nome, empresa, email, telefone, foto_url)`).eq("id", id).single()
        .then(({ data }) => { if (data) setProjeto(data as any); });
    };

    const refetchTasks = async () => {
      const prevTaskIds = Array.from(taskIdsRef.current);
      const [{ data: tasksData }, { data: subsData }] = await Promise.all([
        supabase.from("tasks").select("*").eq("projeto_id", id).order("created_at", { ascending: true }),
        prevTaskIds.length > 0
          ? supabase.from("subtasks").select("*").in("task_id", prevTaskIds).order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (!tasksData) return;
      setTasks(tasksData as Task[]);
      taskIdsRef.current = new Set(tasksData.map((t: any) => t.id));
      const grouped: Record<string, Subtask[]> = {};
      (subsData || []).forEach((s: any) => {
        if (!grouped[s.task_id]) grouped[s.task_id] = [];
        grouped[s.task_id].push(s as Subtask);
      });
      setSubtasksByTask(grouped);
    };

    const refetchFiles = () => {
      supabase.from("arquivos_projeto").select("*").eq("projeto_id", id).order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setFiles(data as ArquivoProjeto[]); });
    };

    const refetchLinks = () => {
      supabase.from("links_projeto").select("*").eq("projeto_id", id).order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setLinks(data as LinkProjeto[]); });
    };

    const channel = supabase
      .channel(`project-detail-realtime-${id}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "collaborator_payment_splits", filter: `project_id=eq.${id}` }, refetchSplits)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "project_member_splits", filter: `project_id=eq.${id}` }, refetchMemberSplits)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "projetos", filter: `id=eq.${id}` }, refetchProjeto)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "tasks", filter: `projeto_id=eq.${id}` }, refetchTasks)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "subtasks" }, (payload: any) => {
        const taskId = payload.new?.task_id || payload.old?.task_id;
        if (taskId && taskIdsRef.current.has(taskId)) refetchTasks();
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "arquivos_projeto", filter: `projeto_id=eq.${id}` }, refetchFiles)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "links_projeto", filter: `projeto_id=eq.${id}` }, refetchLinks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, router.isReady, authUser]);

  useEffect(() => {
    taskIdsRef.current = new Set(tasks.map((t) => t.id));
  }, [tasks]);


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

  const toggleTaskCompletion = useCallback(async (task: Task) => {
    const isOwner = user && projeto && user.id === projeto.user_id;
    if (!isOwner && task.user_id !== user?.id) return;

    const done = isTaskDone(task);
    const novoStatus = done ? "para_fazer" : "concluida";
    const novaConcluida = novoStatus === "concluida";

    try {
      const { error } = await supabase.from("tasks").update({ status: novoStatus, concluida: novaConcluida }).eq("id", task.id);
      if (error) throw error;

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: novoStatus, concluida: novaConcluida } : t)));

      if (novaConcluida) {
        const subs = subtasksByTask[task.id] || [];
        const pendentes = subs.filter((s) => !s.concluida);
        if (pendentes.length > 0) {
          await supabase.from("subtasks").update({ concluida: true }).eq("task_id", task.id).eq("concluida", false);
          setSubtasksByTask((prev) => ({
            ...prev,
            [task.id]: (prev[task.id] || []).map((s) => ({ ...s, concluida: true })),
          }));
        }
      }
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao atualizar tarefa: " + (err.message || "Erro desconhecido") });
    }
  }, [user, projeto, subtasksByTask]);

  const handleAddTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto || !newTaskForm.titulo.trim()) return;
    setAddingTask(true);
    try {
      const assignedTo = newTaskForm.assigned_to || user?.id || projeto.user_id;
      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          projeto_id: projeto.id,
          user_id: assignedTo,
          titulo: newTaskForm.titulo.trim(),
          due_date: newTaskForm.due_date || null,
          status: "para_fazer",
          concluida: false,
        }])
        .select()
        .single();
      if (error) throw error;
      const newTask = data as Task;

      const validSubs = newTaskForm.subtasks.filter((s) => s.trim());
      let newSubs: Subtask[] = [];
      if (validSubs.length > 0) {
        const { data: subsData, error: subsErr } = await supabase
          .from("subtasks")
          .insert(validSubs.map((titulo) => ({
            task_id: newTask.id,
            user_id: user?.id,
            titulo: titulo.trim(),
            concluida: false,
          })))
          .select();
        if (subsErr) throw subsErr;
        newSubs = (subsData || []) as Subtask[];
      }

      setTasks((prev) => [...prev, newTask]);
      setSubtasksByTask((prev) => ({ ...prev, [newTask.id]: newSubs }));
      setNewTaskForm({ titulo: "", due_date: "", assigned_to: "", subtasks: [] });
      setNewTaskOpen(false);
      setNotify({ open: true, msg: "Tarefa adicionada!" });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao adicionar tarefa: " + (err.message || "Erro desconhecido") });
    } finally {
      setAddingTask(false);
    }
  }, [projeto, user, newTaskForm]);

  const toggleSubtaskCompletion = useCallback(async (sub: Subtask) => {
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
  }, []);

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

  const handleCreateInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMsg(null);
    setInviteLink(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setInviteMsg("Você precisa estar logado."); return; }

      const res = await fetch("/api/invites/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          project_id: projeto.id,
          invited_email: inviteEmail.trim(),
          split_type: inviteSplitValue ? inviteSplitType : undefined,
          split_value: inviteSplitValue ? Number(inviteSplitValue) : undefined,
          already_paid: inviteAlreadyPaid,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro desconhecido");
      setInviteLink(json.inviteLink);
      setPendingInvites(prev => [...prev, { id: crypto.randomUUID(), invited_email: inviteEmail.trim(), status: "pending", split_type: inviteSplitValue ? inviteSplitType : undefined, split_value: inviteSplitValue ? Number(inviteSplitValue) : undefined }]);
      setInviteEmail("");
      setInviteSplitValue("");
      setInviteAlreadyPaid(false);
      setInviteMsg(json.email_sent ? "✓ Email de convite enviado automaticamente." : null);
    } catch (err: any) {
      setInviteMsg(err.message || "Erro ao criar convite.");
    } finally {
      setInviteLoading(false);
    }
  }, [projeto, inviteEmail, inviteSplitType, inviteSplitValue, inviteAlreadyPaid]);

  const handleSaveSplit = useCallback(async (memberUserId: string) => {
    if (!projeto || !editSplitValue) return;
    setSavingSplit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/collaborators/set-split", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projeto.id, member_user_id: memberUserId, split_type: editSplitType, split_value: Number(editSplitValue) }),
      });
      if (res.ok) {
        setMemberSplits(prev => {
          const filtered = prev.filter(s => s.member_user_id !== memberUserId);
          return [...filtered, { project_id: projeto.id, member_user_id: memberUserId, split_type: editSplitType, split_value: Number(editSplitValue) }];
        });
        setEditingSplitMemberId(null);
        setNotify({ open: true, msg: "Divisão atualizada com sucesso!" });
      } else {
        const json = await res.json();
        setNotify({ open: true, msg: json.error || "Erro ao salvar divisão." });
      }
    } finally {
      setSavingSplit(false);
    }
  }, [projeto, editSplitType, editSplitValue]);

  const handleMarkSplitPaid = useCallback(async (splitId: string) => {
    if (!projeto) return;
    setMarkingSplitId(splitId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/collaborators/mark-split-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projeto.id, split_id: splitId }),
      });
      if (res.ok) {
        setOwnerCollabSplits(prev =>
          prev.map(s => s.id === splitId ? { ...s, status: "pago", paid_at: new Date().toISOString() } : s)
        );
        setNotify({ open: true, msg: "Parcela marcada como paga!" });
      } else {
        const json = await res.json();
        setNotify({ open: true, msg: json.error || "Erro ao marcar parcela." });
      }
    } finally {
      setMarkingSplitId(null);
    }
  }, [projeto]);

  const handleMarkMemberFullyPaid = useCallback(async (memberUserId: string) => {
    if (!projeto) return;
    setMarkingMemberId(memberUserId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/collaborators/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projeto.id, member_user_id: memberUserId }),
      });
      if (res.ok) {
        setNotify({ open: true, msg: "Colaborador marcado como pago!" });
        supabase.from("collaborator_payment_splits").select("id, pagamento_id, member_user_id, amount, status, paid_at").eq("project_id", projeto.id)
          .then(({ data }) => { if (data) setOwnerCollabSplits(data as any[]); });
      } else {
        const json = await res.json();
        setNotify({ open: true, msg: json.error || "Erro ao marcar como pago." });
      }
    } finally {
      setMarkingMemberId(null);
    }
  }, [projeto]);

  const handleRemoveMember = useCallback(async (memberUserId: string) => {
    if (!projeto) return;
    if (!confirm("Remover este colaborador do projeto?")) return;
    setRemovingMemberId(memberUserId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/collaborators/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projeto.id, member_user_id: memberUserId }),
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.user_id !== memberUserId));
        setMemberSplits(prev => prev.filter(s => s.member_user_id !== memberUserId));
        setNotify({ open: true, msg: "Colaborador removido com sucesso." });
      } else {
        const json = await res.json();
        setNotify({ open: true, msg: json.error || "Erro ao remover colaborador." });
      }
    } finally {
      setRemovingMemberId(null);
    }
  }, [projeto]);


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
                    {user && projeto.user_id === user.id && (
                      <button
                        type="button"
                        onClick={openEditHeader}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-700 border border-primary-600 text-gray-200 text-[13px] hover:bg-primary-600 transition-colors"
                      >
                        <Pencil size={14} />
                        Editar projeto
                      </button>
                    )}
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
                    <div className="text-[12px] text-gray-400">{user && projeto.user_id === user.id ? "Valor total" : "Seu valor"}</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">
                      {user && projeto.user_id === user.id
                        ? (projeto.orcamento ? projeto.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—")
                        : mySplit && projeto.orcamento
                          ? (mySplit.split_type === "percentage"
                              ? (projeto.orcamento * mySplit.split_value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                              : Number(mySplit.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
                          : (projeto.orcamento ? projeto.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—")
                      }
                    </div>
                    {user && projeto.user_id === user.id && memberSplits.length > 0 && projeto.orcamento && (() => {
                      const totalSplits = memberSplits.reduce((acc, s) => {
                        const val = s.split_type === "percentage" ? projeto.orcamento! * s.split_value / 100 : s.split_value;
                        return acc + val;
                      }, 0);
                      const net = projeto.orcamento - totalSplits;
                      return (
                        <div className="mt-1 text-[12px] text-gray-400">
                          Líquido: <span className="text-emerald-400 font-medium">{net.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </div>
                      );
                    })()}
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

            <CollaboratorsSection
              user={user}
              projeto={projeto}
              members={members}
              memberSplits={memberSplits}
              pendingInvites={pendingInvites}
              myCollabSplits={myCollabSplits}
              mySplit={mySplit}
              ownerCollabSplits={ownerCollabSplits}
              inviteOpen={inviteOpen}
              setInviteOpen={setInviteOpen}
              setInviteLink={setInviteLink}
              setInviteMsg={setInviteMsg}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteSplitType={inviteSplitType}
              setInviteSplitType={setInviteSplitType}
              inviteSplitValue={inviteSplitValue}
              setInviteSplitValue={setInviteSplitValue}
              inviteLoading={inviteLoading}
              inviteMsg={inviteMsg}
              inviteLink={inviteLink}
              editingSplitMemberId={editingSplitMemberId}
              setEditingSplitMemberId={setEditingSplitMemberId}
              editSplitType={editSplitType}
              setEditSplitType={setEditSplitType}
              editSplitValue={editSplitValue}
              setEditSplitValue={setEditSplitValue}
              savingSplit={savingSplit}
              removingMemberId={removingMemberId}
              markingMemberId={markingMemberId}
              markingSplitId={markingSplitId}
              handleCreateInvite={handleCreateInvite}
              handleSaveSplit={handleSaveSplit}
              handleMarkSplitPaid={handleMarkSplitPaid}
              handleMarkMemberFullyPaid={handleMarkMemberFullyPaid}
              handleRemoveMember={handleRemoveMember}
              setNotify={setNotify}
            />

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
                  <TaskList
                    tasks={tasks}
                    subtasksByTask={subtasksByTask}
                    user={user}
                    projeto={projeto}
                    members={members}
                    ownerProfile={ownerProfile}
                    displayName={displayName}
                    avatarSrc={avatarSrc}
                    newTaskOpen={newTaskOpen}
                    newTaskForm={newTaskForm}
                    setNewTaskOpen={setNewTaskOpen}
                    setNewTaskForm={setNewTaskForm}
                    handleAddTask={handleAddTask}
                    addingTask={addingTask}
                    toggleTaskCompletion={toggleTaskCompletion}
                    toggleSubtaskCompletion={toggleSubtaskCompletion}
                  />
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

type CollaboratorsSectionProps = {
  user: any;
  projeto: Projeto;
  members: ProjectMember[];
  memberSplits: MemberSplit[];
  pendingInvites: PendingInvite[];
  myCollabSplits: CollabPaySplit[];
  mySplit: MemberSplit | null;
  ownerCollabSplits: any[];
  inviteOpen: boolean;
  setInviteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setInviteLink: React.Dispatch<React.SetStateAction<string | null>>;
  setInviteMsg: React.Dispatch<React.SetStateAction<string | null>>;
  inviteEmail: string;
  setInviteEmail: React.Dispatch<React.SetStateAction<string>>;
  inviteSplitType: "percentage" | "fixed";
  setInviteSplitType: React.Dispatch<React.SetStateAction<"percentage" | "fixed">>;
  inviteSplitValue: string;
  setInviteSplitValue: React.Dispatch<React.SetStateAction<string>>;
  inviteLoading: boolean;
  inviteMsg: string | null;
  inviteLink: string | null;
  editingSplitMemberId: string | null;
  setEditingSplitMemberId: React.Dispatch<React.SetStateAction<string | null>>;
  editSplitType: "percentage" | "fixed";
  setEditSplitType: React.Dispatch<React.SetStateAction<"percentage" | "fixed">>;
  editSplitValue: string;
  setEditSplitValue: React.Dispatch<React.SetStateAction<string>>;
  savingSplit: boolean;
  removingMemberId: string | null;
  markingMemberId: string | null;
  markingSplitId: string | null;
  handleCreateInvite: (e: React.FormEvent) => void;
  handleSaveSplit: (userId: string) => void;
  handleMarkSplitPaid: (splitId: string) => void;
  handleMarkMemberFullyPaid: (userId: string) => void;
  handleRemoveMember: (userId: string) => void;
  setNotify: React.Dispatch<React.SetStateAction<{ open: boolean; msg: string }>>;
};

const CollaboratorsSection = memo(function CollaboratorsSection({
  user, projeto, members, memberSplits, pendingInvites, myCollabSplits, mySplit, ownerCollabSplits,
  inviteOpen, setInviteOpen, setInviteLink, setInviteMsg,
  inviteEmail, setInviteEmail, inviteSplitType, setInviteSplitType, inviteSplitValue, setInviteSplitValue,
  inviteLoading, inviteMsg, inviteLink,
  editingSplitMemberId, setEditingSplitMemberId, editSplitType, setEditSplitType, editSplitValue, setEditSplitValue,
  savingSplit, removingMemberId, markingMemberId, markingSplitId,
  handleCreateInvite, handleSaveSplit, handleMarkSplitPaid, handleMarkMemberFullyPaid, handleRemoveMember,
  setNotify,
}: CollaboratorsSectionProps) {
  const isOwner = user && projeto.user_id === user.id;

  return (
    <>
      {isOwner && (
        <div className="mt-4 bg-primary-800 border border-primary-700 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => { setInviteOpen(v => !v); setInviteLink(null); setInviteMsg(null); }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-[14px] text-gray-200 hover:bg-primary-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Colaboradores
              {(members.length + pendingInvites.length) > 0 && (
                <span className="ml-1 text-[12px] px-1.5 py-0.5 rounded-full bg-primary-600 text-gray-300">
                  {members.length + pendingInvites.length}
                </span>
              )}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: inviteOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {inviteOpen && (
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-primary-700 pt-4">
              {members.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-gray-400 font-medium uppercase tracking-wide">Membros ativos</span>
                  {members.map((m) => {
                    const split = memberSplits.find(s => s.member_user_id === m.user_id);
                    const isEditingThis = editingSplitMemberId === m.user_id;
                    const isRemoving = removingMemberId === m.user_id;
                    const splitLabel = split
                      ? split.split_type === "percentage" ? `${split.split_value}%` : Number(split.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "Sem divisão";
                    const memberDisplayName = m.nome || m.email?.split("@")[0] || "Colaborador";
                    const displayEmail = m.email || "";
                    const avatarUrl = m.avatar_url || "";
                    const initials = memberDisplayName.slice(0, 2).toUpperCase();
                    return (
                      <div key={m.user_id} className="bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-700 border border-primary-600 flex items-center justify-center shrink-0 text-[11px] text-gray-300 font-medium">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={memberDisplayName} className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] text-gray-200 font-medium truncate">{memberDisplayName}</span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 shrink-0">Ativo</span>
                              </div>
                              {displayEmail && (
                                <div className="text-[12px] text-gray-400 truncate">{displayEmail}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[12px] text-gray-400">{splitLabel}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSplitMemberId(m.user_id);
                                setEditSplitType(split?.split_type as any || "percentage");
                                setEditSplitValue(split ? String(split.split_value) : "");
                              }}
                              className="text-[12px] text-primary-400 hover:text-primary-300 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.user_id)}
                              disabled={isRemoving}
                              className="text-[12px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            >
                              {isRemoving ? "..." : "Remover"}
                            </button>
                          </div>
                        </div>
                        {isEditingThis && (
                          <div className="flex items-center gap-2 mt-1">
                            <select
                              value={editSplitType}
                              onChange={(e) => setEditSplitType(e.target.value as any)}
                              className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-1.5 text-[13px] text-gray-100 cursor-pointer"
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">R$ fixo</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              value={editSplitValue}
                              onChange={(e) => setEditSplitValue(e.target.value)}
                              placeholder={editSplitType === "percentage" ? "50" : "2500"}
                              className="w-24 bg-primary-800 border border-primary-700 rounded-lg px-3 py-1.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSplit(m.user_id)}
                              disabled={savingSplit}
                              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                            >
                              {savingSplit ? "..." : "Salvar"}
                            </button>
                            <button type="button" onClick={() => setEditingSplitMemberId(null)} className="text-gray-400 hover:text-gray-200 text-[13px]">
                              Cancelar
                            </button>
                          </div>
                        )}
                        {(() => {
                          const memberSplitRows = ownerCollabSplits.filter(s => s.member_user_id === m.user_id);
                          const hasSplitConfig = memberSplits.some(s => s.member_user_id === m.user_id);
                          if (!memberSplitRows.length) {
                            if (!hasSplitConfig) return null;
                            const memberSplit = memberSplits.find(s => s.member_user_id === m.user_id);
                            if ((memberSplit as any)?.payment_status === "paid") {
                              return (
                                <div className="mt-1 pt-2 border-t border-primary-700/60">
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">Pago</span>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 pt-2 border-t border-primary-700/60">
                                <button
                                  type="button"
                                  onClick={() => handleMarkMemberFullyPaid(m.user_id)}
                                  disabled={markingMemberId === m.user_id}
                                  className="text-[11px] px-3 py-1 rounded-full bg-primary-600 border border-primary-500 text-gray-200 hover:bg-primary-500 transition-colors disabled:opacity-50"
                                >
                                  {markingMemberId === m.user_id ? "..." : "Marcar como pago"}
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-primary-700/60">
                              {memberSplitRows.map((cs, i) => (
                                <div key={cs.id} className="flex items-center justify-between">
                                  <span className="text-[12px] text-gray-400">
                                    Parcela {i + 1} — {Number(cs.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                  {cs.status === "pago" ? (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">Pago</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkSplitPaid(cs.id)}
                                      disabled={markingSplitId === cs.id}
                                      className="text-[11px] px-2 py-0.5 rounded-full bg-primary-600 border border-primary-500 text-gray-200 hover:bg-primary-500 transition-colors disabled:opacity-50"
                                    >
                                      {markingSplitId === cs.id ? "..." : "Marcar pago"}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-gray-400 font-medium uppercase tracking-wide">Convites pendentes</span>
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-[13px] text-gray-200">{inv.invited_email}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/30">Aguardando</span>
                      </div>
                      {inv.split_value != null && (
                        <span className="text-[12px] text-gray-400">
                          {inv.split_type === "percentage" ? `${inv.split_value}%` : Number(inv.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-3 border-t border-primary-700/60">
                <span className="text-[13px] text-gray-300">Convidar novo colaborador</span>
                <form onSubmit={handleCreateInvite} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      required
                      placeholder="Email do colaborador"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 bg-primary-900 border border-primary-700 rounded-xl px-4 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={inviteSplitType}
                      onChange={(e) => setInviteSplitType(e.target.value as any)}
                      className="bg-primary-900 border border-primary-700 rounded-xl px-3 py-2 text-[13px] text-gray-100 cursor-pointer"
                    >
                      <option value="percentage">% do total</option>
                      <option value="fixed">Valor fixo</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={inviteSplitValue}
                      onChange={(e) => setInviteSplitValue(e.target.value)}
                      placeholder={inviteSplitType === "percentage" ? "50" : "2500"}
                      className="w-28 bg-primary-900 border border-primary-700 rounded-xl px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-gray-400 text-[13px]">{inviteSplitType === "percentage" ? "%" : "R$"}</span>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="ml-auto bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors disabled:opacity-60 shrink-0"
                    >
                      {inviteLoading ? "Criando..." : "Convidar"}
                    </button>
                  </div>
                </form>
                {inviteMsg && <p className="text-[13px] text-red-400">{inviteMsg}</p>}
                {inviteLink && (
                  <div className="flex items-center gap-2 bg-primary-900/60 border border-primary-700 rounded-xl px-3 py-2">
                    <span className="flex-1 text-[13px] text-primary-300 truncate">{inviteLink}</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(inviteLink); setNotify({ open: true, msg: "Link copiado!" }); }}
                      className="shrink-0 text-[13px] text-gray-300 bg-primary-700 hover:bg-primary-600 rounded-lg px-3 py-1 transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isOwner && mySplit && (() => {
        const totalValue = mySplit.split_type === "percentage"
          ? (Number(projeto.orcamento ?? 0) * mySplit.split_value / 100)
          : Number(mySplit.split_value ?? 0);
        return (
          <div className="mt-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="text-[14px] text-sky-300 font-medium">Você é colaborador neste projeto</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-400">
                Divisão: <span className="text-gray-200 font-medium">
                  {mySplit.split_type === "percentage"
                    ? `${mySplit.split_value}% do total`
                    : Number(mySplit.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </span>
              {totalValue > 0 && (
                <span className="text-sky-200 font-semibold text-[14px]">
                  {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              )}
            </div>
            {myCollabSplits.length > 0 ? (
              <div className="mt-3 flex flex-col gap-2">
                <span className="text-[12px] text-gray-400 font-medium uppercase tracking-wide">Suas parcelas</span>
                {myCollabSplits.map((cs, i) => (
                  <div key={cs.id} className="flex items-center justify-between bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-2.5">
                    <span className="text-[13px] text-gray-200">
                      Parcela {i + 1} — {Number(cs.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <span className={`text-[12px] px-2 py-0.5 rounded-full border ${
                      cs.status === "pago"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-400/30"
                    }`}>
                      {cs.status === "pago" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-2.5">
                <span className="text-[13px] text-gray-200">
                  Total — {totalValue > 0
                    ? totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "valor a definir"}
                </span>
                <span className={`text-[12px] px-2 py-0.5 rounded-full border ${
                  (mySplit as any)?.payment_status === "paid"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-400/30"
                }`}>
                  {(mySplit as any)?.payment_status === "paid" ? "Pago" : "Pendente"}
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
});

type TaskListProps = {
  tasks: Task[];
  subtasksByTask: Record<string, Subtask[]>;
  user: any;
  projeto: Projeto;
  members: ProjectMember[];
  ownerProfile: { nome: string | null; avatar_url: string | null } | null;
  displayName: string;
  avatarSrc: string;
  newTaskOpen: boolean;
  newTaskForm: { titulo: string; due_date: string; assigned_to: string; subtasks: string[] };
  setNewTaskOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNewTaskForm: React.Dispatch<React.SetStateAction<{ titulo: string; due_date: string; assigned_to: string; subtasks: string[] }>>;
  handleAddTask: (e: React.FormEvent) => void;
  addingTask: boolean;
  toggleTaskCompletion: (t: Task) => void;
  toggleSubtaskCompletion: (s: Subtask) => void;
};

const TaskList = memo(function TaskList({
  tasks,
  subtasksByTask,
  user,
  projeto,
  members,
  ownerProfile,
  displayName,
  avatarSrc,
  newTaskOpen,
  newTaskForm,
  setNewTaskOpen,
  setNewTaskForm,
  handleAddTask,
  addingTask,
  toggleTaskCompletion,
  toggleSubtaskCompletion,
}: TaskListProps) {
  const isOwner = user && projeto && user.id === projeto.user_id;
  const ownerEntry = (() => {
    if (isOwner) return { user_id: projeto.user_id, name: `${displayName} (eu)`, avatar: avatarSrc };
    const ownerMember = members.find((m) => m.user_id === projeto.user_id);
    const ownerName = ownerMember?.nome || ownerProfile?.nome || "Dono do projeto";
    const ownerAvatar = ownerMember?.avatar_url || ownerProfile?.avatar_url || "";
    return { user_id: projeto.user_id, name: ownerName, avatar: ownerAvatar };
  })();
  const assignableMembers = [
    ownerEntry,
    ...members
      .filter((m) => m.user_id !== projeto.user_id)
      .map((m) => ({
        user_id: m.user_id,
        name: m.user_id === user?.id
          ? `${m.nome || m.email?.split("@")[0] || "Colaborador"} (eu)`
          : (m.nome || m.email?.split("@")[0] || "Colaborador"),
        avatar: m.avatar_url || "",
      })),
  ];

  function getAssigneeName(userId: string | null) {
    if (!userId) return null;
    const found = assignableMembers.find((m) => m.user_id === userId);
    return found?.name || null;
  }

  function getAssigneeAvatar(userId: string | null) {
    if (!userId) return "";
    const found = assignableMembers.find((m) => m.user_id === userId);
    return found?.avatar || "";
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[20px] text-primary-100 font-semibold">Etapas do projeto</h2>
        <button
          type="button"
          onClick={() => {
            setNewTaskForm({ titulo: "", due_date: "", assigned_to: user?.id || "", subtasks: [] });
            setNewTaskOpen((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-700 border border-primary-600 text-gray-200 text-[13px] hover:bg-primary-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova tarefa
        </button>
      </div>

      {newTaskOpen && (
        <form onSubmit={handleAddTask} className="mb-2 border-b border-gray-700 pb-3">
          <div className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-full border-2 border-primary-600 shrink-0" />
            <input
              type="text"
              placeholder="Nome da tarefa"
              required
              value={newTaskForm.titulo}
              onChange={(e) => setNewTaskForm((p) => ({ ...p, titulo: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setNewTaskForm((p) => ({ ...p, subtasks: [...p.subtasks, ""] }));
                }
              }}
              className="flex-1 bg-transparent text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none font-medium"
              autoFocus
            />
          </div>

          {newTaskForm.subtasks.map((sub, idx) => (
            <div key={idx} className="ml-10 flex items-center gap-2 py-1.5 border-t border-gray-700">
              <span className="text-gray-600 text-[13px] select-none">⠿</span>
              <div className="w-5 h-5 rounded-md border-2 border-primary-600 shrink-0" />
              <input
                type="text"
                placeholder="Nome da subtarefa"
                value={sub}
                autoFocus
                onChange={(e) => setNewTaskForm((p) => {
                  const updated = [...p.subtasks];
                  updated[idx] = e.target.value;
                  return { ...p, subtasks: updated };
                })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setNewTaskForm((p) => ({ ...p, subtasks: [...p.subtasks, ""] }));
                  }
                  if (e.key === "Backspace" && sub === "") {
                    e.preventDefault();
                    setNewTaskForm((p) => ({ ...p, subtasks: p.subtasks.filter((_, i) => i !== idx) }));
                  }
                }}
                className="flex-1 bg-transparent text-[14px] text-gray-300 placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setNewTaskForm((p) => ({ ...p, subtasks: p.subtasks.filter((_, i) => i !== idx) }))}
                className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}

          <div className="ml-10 mt-1 border-t border-gray-700 pt-1.5">
            <button
              type="button"
              onClick={() => setNewTaskForm((p) => ({ ...p, subtasks: [...p.subtasks, ""] }))}
              className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Adicionar subtarefa (Enter ou clicar +)
            </button>
          </div>

          <div className="ml-10 mt-2 border-t border-gray-700 pt-2 flex items-center gap-3">
            <DatePicker
              value={newTaskForm.due_date}
              onChange={(v) => setNewTaskForm((p) => ({ ...p, due_date: v }))}
              placeholder="Prazo (opcional)"
              className="w-44"
              buttonClassName={`w-full flex items-center gap-2 px-0 py-1 bg-transparent text-left cursor-pointer text-[13px] ${newTaskForm.due_date ? "text-gray-200" : "text-gray-500"}`}
            />
            {isOwner && assignableMembers.length > 1 && (
              <select
                value={newTaskForm.assigned_to}
                onChange={(e) => setNewTaskForm((p) => ({ ...p, assigned_to: e.target.value }))}
                className="bg-transparent border-0 text-[13px] text-gray-500 focus:outline-none cursor-pointer"
              >
                {assignableMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id} className="bg-primary-800 text-gray-100">{m.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="ml-10 mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={addingTask}
              className="px-4 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[13px] transition-colors disabled:opacity-60"
            >
              {addingTask ? "Salvando..." : "Salvar tarefa"}
            </button>
            <button
              type="button"
              onClick={() => setNewTaskOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-primary-800 border border-primary-700 text-gray-300 text-[13px] hover:bg-primary-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="text-gray-400 text-[14px]">Nenhuma tarefa criada ainda.</div>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-700">
            {tasks.map((t) => {
              const subs = subtasksByTask[t.id] || [];
              const done = isTaskDone(t);
              const canToggle = isOwner || t.user_id === user?.id;
              const assigneeName = getAssigneeName(t.user_id);
              const assigneeAvatar = getAssigneeAvatar(t.user_id);
              const assigneeInitials = assigneeName ? assigneeName.slice(0, 2).toUpperCase() : "?";

              return (
                <li key={t.id} className="py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => canToggle && toggleTaskCompletion(t)}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                        canToggle ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                      } ${
                        done
                          ? "bg-primary-500/20 border-primary-400 text-primary-300"
                          : "bg-primary-900 border-primary-600 hover:border-primary-400"
                      }`}
                      title={canToggle ? undefined : "Você só pode concluir suas próprias tarefas"}
                    >
                      {done && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    <span className={`flex-1 text-[15px] font-medium ${done ? "line-through text-gray-500" : "text-gray-100"}`}>
                      {t.titulo}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      {assigneeName && (
                        <div className="flex items-center gap-1.5 bg-primary-800 border border-primary-700 rounded-full pl-1 pr-2.5 py-0.5">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-primary-600 flex items-center justify-center shrink-0 text-[8px] text-gray-300 font-medium">
                            {assigneeAvatar ? (
                              <img src={assigneeAvatar} alt={assigneeName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{assigneeInitials}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400">{assigneeName}</span>
                        </div>
                      )}
                      {t.due_date && (
                        <span className="text-[12px] text-gray-500">
                          {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {subs.length > 0 && (
                    <div className="mt-1 ml-11 flex flex-col">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 py-1.5 border-t border-gray-700 first:border-t-0">
                          <span className="text-primary-700 text-[13px] select-none shrink-0">⠿</span>
                          <button
                            type="button"
                            onClick={() => toggleSubtaskCompletion(s)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              s.concluida
                                ? "bg-primary-500/20 border-primary-400 text-primary-300"
                                : "bg-primary-900 border-primary-600 hover:border-primary-400"
                            }`}
                          >
                            {s.concluida && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-[14px] ${s.concluida ? "line-through text-gray-600" : "text-gray-300"}`}>
                            {s.titulo}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
});

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