"use client";

import { useCallback, useEffect, memo, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { syncPagamentosComValorProjeto } from "@/lib/supabaseQueries/pagamentos";
import { calcularUrgencia, tempoRelativo } from "@/lib/utils";
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
import { Pencil, ClipboardList, Timer, Globe, Send, Plus, Lock, Zap, Copy, Check, X, AlertCircle } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import HeaderProfile from "@/components/HeaderProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { triggerUpgradeBanner } from "@/lib/limitGuard";
import { checkStorageAvailable } from "@/lib/storageCheck";

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

type BriefingEnvio = {
  id: string;
  user_id: string;
  template_id: string;
  projeto_id: string | null;
  status: string;
  prazo_resposta: string | null;
  respondido_em: string | null;
  created_at: string;
  template?: { id: string; titulo: string } | null;
};

type BriefingResposta = { id: string; pergunta: string; resposta: string | null };
type BriefingEnvioComRespostas = BriefingEnvio & {
  respondido_em: string | null;
  briefings_respostas: BriefingResposta[];
};

type TabId = "descricao" | "etapas" | "arquivos" | "links" | "briefing" | "entregaveis";

type AdiantamentoStatus = "solicitado" | "aprovado" | "recusado" | "pago" | "cancelado";
type Adiantamento = {
  id: string;
  projeto_id: string;
  user_id: string;
  valor: number;
  motivo: string;
  status: AdiantamentoStatus;
  feedback_cliente: string | null;
  pix_chave: string | null;
  pix_tipo: string | null;
  solicitado_em: string;
  respondido_em: string | null;
  pago_em: string | null;
  created_at: string;
};

type EntregavelArquivo = { url: string; tipo: string; nome: string };

type Entregavel = {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  arquivo_url: string | null;
  arquivo_tipo: string | null;
  arquivos: EntregavelArquivo[] | null;
  status: "rascunho" | "aguardando_aprovacao" | "aprovado" | "para_alteracao";
  feedback_cliente: string | null;
  feedback_imagem_url: string | null;
  feedback_pins: Array<{ xPct: number; yPct: number; text: string }> | null;
  feedback_imagens: Array<{ url: string; pins: Array<{ xPct: number; yPct: number; text: string }> }> | null;
  reviewed_at: string | null;
  created_at: string;
};

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




function renderStatusBadgeDetail(status: ProjetoStatus | string) {
  const s = String(status || "").trim().toLowerCase();
  let cfg: { color: string; bg: string; border: string; label: string };
  if (s === "concluído" || s === "concluido" || s === "finalizado" || s === "concluído") {
    cfg = { color: "var(--success-medium)", bg: "rgba(102,187,106,0.10)", border: "rgba(102,187,106,0.35)", label: "Concluído" };
  } else if (s === "arquivado" || s === "cancelado") {
    cfg = { color: "var(--gray-400)", bg: "rgba(148,169,173,0.08)", border: "rgba(148,169,173,0.35)", label: "Arquivado" };
  } else if (s === "fazendo" || s === "em andamento" || s === "em_andamento" || s === "andamento" || s === "doing" || s === "in progress") {
    cfg = { color: "var(--alert-medium)", bg: "rgba(255,167,38,0.10)", border: "rgba(255,167,38,0.35)", label: "Fazendo" };
  } else {
    cfg = { color: "var(--primary-300)", bg: "rgba(30,182,232,0.10)", border: "rgba(30,182,232,0.35)", label: "Para fazer" };
  }
  return (
    <span style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "999px", display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: 600, padding: "5px 12px", whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 8px currentColor", flexShrink: 0, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
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

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Record<string, Subtask[]>>({});
  const [files, setFiles] = useState<ArquivoProjeto[]>([]);
  const [links, setLinks] = useState<LinkProjeto[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string | null; empresa: string | null }[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newLink, setNewLink] = useState({ titulo: "", url: "" });
  const [notify, setNotify] = useState<{ open: boolean; msg: string }>({ open: false, msg: "" });

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [activeTab, setActiveTab] = useState<TabId>("descricao");

  useEffect(() => {
    if (!id) return;
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(`proj_tab_${id}`) : null;
    const valid: TabId[] = ["descricao", "etapas", "arquivos", "links", "briefing", "entregaveis"];
    if (saved && valid.includes(saved as TabId)) setActiveTab(saved as TabId);
  }, [id]);

  const changeTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (id && typeof window !== "undefined") sessionStorage.setItem(`proj_tab_${id}`, tab);
  }, [id]);

  const { user: authUser } = useAuth();
  const subscription = useSubscription();
  const [user, setUser] = useState<any>(null);


  const [coverUploading, setCoverUploading] = useState(false);
  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [briefingEnvios, setBriefingEnvios] = useState<BriefingEnvio[]>([]);
  const [projetoBriefingEnvios, setProjetoBriefingEnvios] = useState<BriefingEnvioComRespostas[]>([]);
  const [attachBriefingOpen, setAttachBriefingOpen] = useState(false);
  const [attachingBriefing, setAttachingBriefing] = useState(false);

  const [sendNewBriefingOpen, setSendNewBriefingOpen] = useState(false);
  const [sendNewBriefingTemplates, setSendNewBriefingTemplates] = useState<{ id: string; titulo: string }[]>([]);
  const [loadingNewBriefingTemplates, setLoadingNewBriefingTemplates] = useState(false);
  const [sendNewBriefingTemplateId, setSendNewBriefingTemplateId] = useState<string | null>(null);
  const [sendNewBriefingPrazo, setSendNewBriefingPrazo] = useState("");
  const [sendNewBriefingSendEmail, setSendNewBriefingSendEmail] = useState(false);
  const [sendingNewBriefing, setSendingNewBriefing] = useState(false);
  const [sendNewBriefingError, setSendNewBriefingError] = useState<string | null>(null);

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
  const [markingSplitId, setMarkingSplitId] = useState<string | null>(null);
  const [markingMemberId, setMarkingMemberId] = useState<string | null>(null);
  const [ownerCollabSplits, setOwnerCollabSplits] = useState<any[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalMsg, setPortalMsg] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const [entregaveis, setEntregaveis] = useState<Entregavel[]>([]);
  const [newEntregavel, setNewEntregavel] = useState({ titulo: "", descricao: "", url: "" });
  const [entregavelAnexoTipo, setEntregavelAnexoTipo] = useState<"nenhum" | "link" | "arquivo">("nenhum");
  const [entregavelArquivos, setEntregavelArquivos] = useState<File[]>([]);
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  const [sendingEntregavelId, setSendingEntregavelId] = useState<string | null>(null);
  const [deletingEntregavelId, setDeletingEntregavelId] = useState<string | null>(null);
  const [feedbackViewerId, setFeedbackViewerId] = useState<string | null>(null);
  const [uploadingCorrectedId, setUploadingCorrectedId] = useState<string | null>(null);
  const [showEntregavelForm, setShowEntregavelForm] = useState(false);
  const [entregavelFilter, setEntregavelFilter] = useState<"todos" | "aguardando_aprovacao" | "para_alteracao" | "aprovado">("todos");

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ titulo: "", due_date: "", assigned_to: "", subtasks: [] as string[] });
  const [addingTask, setAddingTask] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{ nome: string | null; avatar_url: string | null } | null>(null);

  const [adiantamentos, setAdiantamentos] = useState<Adiantamento[]>([]);
  const [adiantamentoModal, setAdiantamentoModal] = useState(false);
  const [adiantamentoValor, setAdiantamentoValor] = useState("");
  const [adiantamentoMotivo, setAdiantamentoMotivo] = useState("");
  const [adiantamentoPixTipo, setAdiantamentoPixTipo] = useState("");
  const [adiantamentoPixValor, setAdiantamentoPixValor] = useState("");
  const [adiantamentoPixPais, setAdiantamentoPixPais] = useState("55");
  const [adiantamentoPixPaisOpen, setAdiantamentoPixPaisOpen] = useState(false);
  const adiantamentoPixPaisRef = useRef<HTMLDivElement>(null);
  const [adiantamentoLoading, setAdiantamentoLoading] = useState(false);
  const [adiantamentoFeedback, setAdiantamentoFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmandoRecebId, setConfirmandoRecebId] = useState<string | null>(null);
  const [cancelandoAdiantId, setCancelandoAdiantId] = useState<string | null>(null);

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
          { data: envsData },
          { data: clientesData },
          { data: membersData },
          { data: memberSplitsData },
          { data: pendingInvitesData },
          { data: mySplitData },
          { data: myCollabSplitsData },
          { data: ownerCollabSplitsData },
          { data: entregaveisData },
          { data: projetoEnvsData },
          { data: adiantamentosData },
        ] = await Promise.all([
          supabase
            .from("projetos")
            .select(`*, clientes:cliente_id (id, nome, empresa, email, telefone, foto_url)`)
            .eq("id", id)
            .single(),
          supabase.from("tasks").select("id, projeto_id, user_id, titulo, descricao, status, concluida, due_date, completed_at, created_at, updated_at").eq("projeto_id", id).order("created_at", { ascending: true }),
          supabase.from("arquivos_projeto").select("id, projeto_id, user_id, nome, url, status, created_at").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("links_projeto").select("id, projeto_id, user_id, titulo, url, created_at").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("briefings_envios").select("id, user_id, template_id, projeto_id, status, prazo_resposta, respondido_em, created_at, template:template_id(id, titulo)").eq("user_id", authUser.id).order("created_at", { ascending: false }),
          supabase.from("clientes").select("id, nome, empresa").eq("user_id", authUser.id).order("nome", { ascending: true }),
          supabase.from("project_members").select("user_id, role, email, nome, avatar_url").eq("project_id", id).neq("role", "cliente"),
          supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, payment_status").eq("project_id", id),
          supabase.from("project_invites").select("id, invited_email, status, split_type, split_value").eq("project_id", id).eq("status", "pending"),
          supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, payment_status, paid_at").eq("project_id", id).eq("member_user_id", authUser.id).maybeSingle(),
          supabase.from("collaborator_payment_splits").select("id, pagamento_id, amount, status, paid_at").eq("project_id", id).eq("member_user_id", authUser.id),
          supabase.from("collaborator_payment_splits").select("id, pagamento_id, member_user_id, amount, status, paid_at").eq("project_id", id),
          supabase.from("entregaveis").select("id, titulo, descricao, url, arquivo_url, arquivo_tipo, arquivos, status, feedback_cliente, feedback_imagem_url, feedback_pins, feedback_imagens, reviewed_at, created_at").eq("project_id", id).order("created_at", { ascending: false }),
          supabase.from("briefings_envios").select("id, user_id, template_id, projeto_id, status, prazo_resposta, respondido_em, created_at, template:template_id(id, titulo), briefings_respostas(id, pergunta, resposta)").eq("projeto_id", id).order("created_at", { ascending: false }),
          supabase.from("adiantamentos").select("id, projeto_id, user_id, valor, motivo, status, feedback_cliente, pix_chave, pix_tipo, solicitado_em, respondido_em, pago_em, created_at").eq("projeto_id", id).order("created_at", { ascending: false }),
        ]);

        if (projetoErr) throw projetoErr;
        if (tasksErr) throw tasksErr;
        if (filesErr) throw filesErr;
        if (linksErr) throw linksErr;
        if (cancelled) return;

        const proj = projetoData as Projeto;
        setProjeto(proj);

        const tks = (tasksData || []) as Task[];
        setTasks(tks);
        setFiles((filesData || []) as ArquivoProjeto[]);
        setLinks((linksData || []) as LinkProjeto[]);
        setBriefingEnvios((envsData || []) as unknown as BriefingEnvio[]);
        setClientes((clientesData || []) as { id: string; nome: string | null; empresa: string | null }[]);
        setMembers((membersData || []) as any[]);
        setMemberSplits((memberSplitsData || []) as any[]);
        setPendingInvites((pendingInvitesData || []) as any[]);
        setMySplit((mySplitData as any) || null);
        setMyCollabSplits((myCollabSplitsData || []) as any[]);
        setOwnerCollabSplits((ownerCollabSplitsData || []) as any[]);
        setEntregaveis((entregaveisData || []) as Entregavel[]);
        setProjetoBriefingEnvios((projetoEnvsData || []) as unknown as BriefingEnvioComRespostas[]);
        setAdiantamentos((adiantamentosData || []) as Adiantamento[]);

        setError(null);

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

    const refetchProjetoBriefingEnvios = () => {
      supabase
        .from("briefings_envios")
        .select("id, user_id, template_id, projeto_id, status, prazo_resposta, respondido_em, created_at, template:template_id(id, titulo), briefings_respostas(id, pergunta, resposta)")
        .eq("projeto_id", id)
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setProjetoBriefingEnvios(data as unknown as BriefingEnvioComRespostas[]); });
    };

    const refetchAdiantamentos = () => {
      supabase
        .from("adiantamentos")
        .select("id, projeto_id, user_id, valor, motivo, status, feedback_cliente, pix_chave, pix_tipo, solicitado_em, respondido_em, pago_em, created_at")
        .eq("projeto_id", id)
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setAdiantamentos(data as Adiantamento[]); });
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
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "briefings_envios", filter: `projeto_id=eq.${id}` }, refetchProjetoBriefingEnvios)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "briefings_respostas", filter: `projeto_id=eq.${id}` }, refetchProjetoBriefingEnvios)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "adiantamentos", filter: `projeto_id=eq.${id}` }, refetchAdiantamentos)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, router.isReady, authUser]);

  useEffect(() => {
    taskIdsRef.current = new Set(tasks.map((t) => t.id));
  }, [tasks]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (adiantamentoPixPaisRef.current && !adiantamentoPixPaisRef.current.contains(e.target as Node)) {
        setAdiantamentoPixPaisOpen(false);
      }
    }
    if (adiantamentoPixPaisOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [adiantamentoPixPaisOpen]);


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

    const { data: { session: uploadSession } } = await supabase.auth.getSession();
    if (uploadSession) {
      const hasSpace = await checkStorageAvailable(file.size, uploadSession.access_token);
      if (!hasSpace) { triggerUpgradeBanner("storage"); return; }
    }

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
      try {
        await supabase.from("atividades").insert([{
          user_id: authUser.id,
          projeto_id: projeto.id,
          tipo: "arquivo_enviado",
          descricao: `Arquivo "${file.name}" foi enviado.`,
        }]);
      } catch {}
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

      const { data: { session: coverSession } } = await supabase.auth.getSession();
      if (coverSession) {
        const hasSpace = await checkStorageAvailable(f.size, coverSession.access_token);
        if (!hasSpace) { triggerUpgradeBanner("storage"); return; }
      }

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
        try {
          await supabase.from("atividades").insert([{
            user_id: user?.id,
            projeto_id: projeto?.id,
            tipo: "tarefa_concluida",
            descricao: `Tarefa "${task.titulo}" foi concluída.`,
          }]);
        } catch {}
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

      if (nova) {
        try {
          await supabase.from("atividades").insert([{
            user_id: user?.id,
            projeto_id: projeto?.id,
            tipo: "tarefa_concluida",
            descricao: `Subtarefa "${sub.titulo}" foi concluída.`,
          }]);
        } catch {}
      }
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao atualizar subtask: " + (err.message || "Erro desconhecido") });
    }
  }, [user, projeto]);

  async function handleDetachBriefing(envioId: string) {
    if (!projeto) return;
    try {
      const { error } = await supabase
        .from("briefings_envios")
        .update({ projeto_id: null })
        .eq("id", envioId);
      if (error) throw error;
      setProjetoBriefingEnvios((prev) => prev.filter((e) => e.id !== envioId));
      setBriefingEnvios((prev) => prev.map((e) => e.id === envioId ? { ...e, projeto_id: null } : e));
      setNotify({ open: true, msg: "Briefing desvinculado." });
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao desvincular briefing: " + (err.message || "Erro desconhecido") });
    }
  }

  async function handleOpenSendNewBriefing() {
    setSendNewBriefingOpen(true);
    setSendNewBriefingTemplateId(null);
    setSendNewBriefingPrazo("");
    setSendNewBriefingSendEmail(false);
    setSendNewBriefingError(null);
    if (sendNewBriefingTemplates.length > 0) return;
    setLoadingNewBriefingTemplates(true);
    const { data } = await supabase
      .from("briefings_templates")
      .select("id, titulo")
      .eq("user_id", user.id)
      .order("titulo", { ascending: true });
    setSendNewBriefingTemplates(data || []);
    setLoadingNewBriefingTemplates(false);
  }

  async function handleSendNewBriefing() {
    if (!projeto || !user) return;
    if (!sendNewBriefingTemplateId) {
      setSendNewBriefingError("Selecione um modelo de briefing.");
      return;
    }
    setSendingNewBriefing(true);
    setSendNewBriefingError(null);
    try {
      const { data: envioData, error: insertErr } = await supabase
        .from("briefings_envios")
        .insert({
          user_id: user.id,
          template_id: sendNewBriefingTemplateId,
          projeto_id: projeto.id,
          cliente_id: projeto.cliente_id || null,
          status: "pendente",
          prazo_resposta: sendNewBriefingPrazo || null,
          token: crypto.randomUUID(),
          email_enviado: false,
        })
        .select("id, user_id, template_id, projeto_id, status, prazo_resposta, respondido_em, created_at, template:template_id(id, titulo), briefings_respostas(id, pergunta, resposta)")
        .single();
      if (insertErr || !envioData) throw insertErr;

      if (sendNewBriefingSendEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch("/api/briefings/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ envio_id: envioData.id }),
          });
        }
      }

      setProjetoBriefingEnvios((prev) => [envioData as unknown as BriefingEnvioComRespostas, ...prev]);
      setBriefingEnvios((prev) => [{
        id: envioData.id,
        user_id: envioData.user_id,
        template_id: envioData.template_id,
        projeto_id: envioData.projeto_id,
        status: envioData.status,
        prazo_resposta: envioData.prazo_resposta,
        respondido_em: (envioData as any).respondido_em ?? null,
        created_at: envioData.created_at,
        template: (envioData as any).template ?? null,
      }, ...prev]);
      setSendNewBriefingOpen(false);
      setNotify({ open: true, msg: sendNewBriefingSendEmail ? "Briefing enviado por e-mail ao cliente!" : "Briefing criado com sucesso!" });
    } catch (err: any) {
      setSendNewBriefingError(err?.message || "Erro ao criar briefing.");
    } finally {
      setSendingNewBriefing(false);
    }
  }

  async function handleAttachBriefing(envioId: string) {
    if (!projeto) return;
    const envio = briefingEnvios.find(e => e.id === envioId);
    if (envio?.projeto_id && envio.projeto_id !== projeto.id) {
      setNotify({ open: true, msg: "Este briefing já está vinculado a outro projeto. Desvincule-o primeiro." });
      return;
    }
    setAttachingBriefing(true);
    try {
      const { error: updErr } = await supabase
        .from("briefings_envios")
        .update({ projeto_id: projeto.id })
        .eq("id", envioId);
      if (updErr) throw updErr;

      const { data: envioData, error: envioErr } = await supabase
        .from("briefings_envios")
        .select("id, user_id, template_id, projeto_id, status, prazo_resposta, respondido_em, created_at, template:template_id(id, titulo), briefings_respostas(id, pergunta, resposta)")
        .eq("id", envioId)
        .single();
      if (envioErr) throw envioErr;

      setProjetoBriefingEnvios(prev => {
        const exists = prev.some(e => e.id === envioId);
        if (exists) return prev.map(e => e.id === envioId ? (envioData as unknown as BriefingEnvioComRespostas) : e);
        return [envioData as unknown as BriefingEnvioComRespostas, ...prev];
      });
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

    const marcandoConcluido = editForm.status === "Concluído" && projeto.status !== "Concluído";

    if (marcandoConcluido) {
      const bloqueios: string[] = [];

      const tarefasIncompletas = tasks.filter((t) => !isTaskDone(t));
      if (tarefasIncompletas.length > 0) {
        bloqueios.push(`${tarefasIncompletas.length} tarefa(s) não concluída(s)`);
      }

      const entregaveisPendentes = entregaveis.filter((e) => e.status === "aguardando_aprovacao");
      if (entregaveisPendentes.length > 0) {
        bloqueios.push(`${entregaveisPendentes.length} entregável(is) aguardando aprovação do cliente`);
      }

      const briefingsSemResposta = projetoBriefingEnvios.filter(
        (e) => e.status !== "respondido" && !e.respondido_em && (!e.briefings_respostas || e.briefings_respostas.length === 0)
      );
      if (briefingsSemResposta.length > 0) {
        bloqueios.push(`${briefingsSemResposta.length} briefing(s) enviado(s) sem resposta`);
      }

      const { data: pagamentosPendentes } = await supabase
        .from("pagamentos")
        .select("id")
        .eq("projeto_id", projeto.id)
        .eq("status", "pendente");
      if (pagamentosPendentes && pagamentosPendentes.length > 0) {
        bloqueios.push(`${pagamentosPendentes.length} pagamento(s) pendente(s)`);
      }

      if (bloqueios.length > 0) {
        setNotify({ open: true, msg: `Não é possível concluir o projeto: ${bloqueios.join("; ")}.` });
        return;
      }
    }

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

      try {
        await syncPagamentosComValorProjeto(projeto.id, updates.orcamento);
      } catch (syncErr) {
        console.error("Erro ao sincronizar pagamentos com o novo valor do projeto:", syncErr);
      }

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

  const PAISES_PIX = [
    { code: "55",  flag: "🇧🇷", label: "Brasil",   dial: "+55" },
    { code: "1",   flag: "🇺🇸", label: "EUA",      dial: "+1" },
    { code: "351", flag: "🇵🇹", label: "Portugal", dial: "+351" },
  ];

  function formatCpfCnpjAd(value: string): string {
    const d = value.replace(/\D/g, "");
    if (d.length <= 11) {
      const s = d.slice(0, 11);
      const a = s.slice(0, 3), b = s.slice(3, 6), c = s.slice(6, 9), e = s.slice(9, 11);
      if (s.length <= 3) return a;
      if (s.length <= 6) return `${a}.${b}`;
      if (s.length <= 9) return `${a}.${b}.${c}`;
      return `${a}.${b}.${c}-${e}`;
    }
    const s = d.slice(0, 14);
    const a = s.slice(0, 2), b = s.slice(2, 5), c = s.slice(5, 8), x = s.slice(8, 12), e = s.slice(12, 14);
    if (s.length <= 2) return a;
    if (s.length <= 5) return `${a}.${b}`;
    if (s.length <= 8) return `${a}.${b}.${c}`;
    if (s.length <= 12) return `${a}.${b}.${c}/${x}`;
    return `${a}.${b}.${c}/${x}-${e}`;
  }

  function formatPixPhoneAd(value: string, pais: string): string {
    const d = value.replace(/\D/g, "");
    if (pais === "55") {
      const s = d.slice(0, 11);
      const ddd = s.slice(0, 2), n1 = s.slice(2, 7), n2 = s.slice(7, 11);
      if (s.length <= 2) return s.length ? `(${ddd}` : "";
      if (s.length <= 7) return `(${ddd}) ${n1}`;
      return `(${ddd}) ${n1}-${n2}`;
    }
    if (pais === "1") {
      const s = d.slice(0, 10);
      const a = s.slice(0, 3), b = s.slice(3, 6), c = s.slice(6, 10);
      if (s.length <= 3) return s.length ? `(${a}` : "";
      if (s.length <= 6) return `(${a}) ${b}`;
      return `(${a}) ${b}-${c}`;
    }
    if (pais === "351") {
      const s = d.slice(0, 9);
      const a = s.slice(0, 3), b = s.slice(3, 6), c = s.slice(6, 9);
      if (s.length <= 3) return a;
      if (s.length <= 6) return `${a} ${b}`;
      return `${a} ${b} ${c}`;
    }
    return d.slice(0, 15);
  }

  function pixPhonePlaceholderAd(pais: string): string {
    if (pais === "55") return "(11) 99999-9999";
    if (pais === "1") return "(555) 555-5555";
    if (pais === "351") return "912 345 678";
    return "999999999";
  }

  function pixPhoneMaxLenAd(pais: string): number {
    if (pais === "55") return 16;
    if (pais === "1") return 14;
    if (pais === "351") return 11;
    return 15;
  }

  async function handleSolicitarAdiantamento() {
    if (!projeto) return;
    const valor = Number(adiantamentoValor.replace(",", "."));
    if (!valor || valor <= 0) { setAdiantamentoFeedback({ ok: false, msg: "Informe um valor válido." }); return; }
    if (!adiantamentoMotivo.trim()) { setAdiantamentoFeedback({ ok: false, msg: "Informe o motivo." }); return; }
    if (!adiantamentoPixValor.trim()) { setAdiantamentoFeedback({ ok: false, msg: "Informe a chave PIX." }); return; }

    setAdiantamentoLoading(true);
    setAdiantamentoFeedback(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão inválida.");
      const resp = await fetch("/api/adiantamentos/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projeto_id: projeto.id,
          valor,
          motivo: adiantamentoMotivo.trim(),
          pix_chave: adiantamentoPixValor.trim(),
          pix_tipo: adiantamentoPixTipo || null,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Erro ao solicitar adiantamento.");
      setAdiantamentoModal(false);
      setAdiantamentoValor("");
      setAdiantamentoMotivo("");
      setAdiantamentoFeedback(null);
    } catch (err: any) {
      setAdiantamentoFeedback({ ok: false, msg: err.message });
    } finally {
      setAdiantamentoLoading(false);
    }
  }

  async function handleConfirmarRecebimento(adiantamentoId: string) {
    setConfirmandoRecebId(adiantamentoId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const resp = await fetch("/api/adiantamentos/confirmar-recebimento", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adiantamento_id: adiantamentoId }),
      });
      if (!resp.ok) {
        const json = await resp.json();
        setNotify({ open: true, msg: json.error || "Erro ao confirmar recebimento." });
      }
    } finally {
      setConfirmandoRecebId(null);
    }
  }

  async function handleCancelarAdiantamento(adiantamentoId: string) {
    if (!confirm("Cancelar esta solicitação de adiantamento?")) return;
    setCancelandoAdiantId(adiantamentoId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      await fetch("/api/adiantamentos/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adiantamento_id: adiantamentoId }),
      });
    } finally {
      setCancelandoAdiantId(null);
    }
  }

  const handleCreateInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto || !inviteEmail.trim()) return;

    const coworkingLimit = subscription.limits.coworkingMembros;
    if (coworkingLimit === 0) {
      triggerUpgradeBanner("coworking");
      return;
    }
    if (coworkingLimit !== null) {
      const collaboratorCount = members.filter(m => m.role !== "owner" && m.role !== "cliente").length
        + pendingInvites.length;
      if (collaboratorCount >= coworkingLimit) {
        triggerUpgradeBanner("coworking");
        return;
      }
    }

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

  const handleSendPortalAccess = useCallback(async () => {
    if (!projeto) return;
    setPortalLoading(true);
    setPortalMsg(null);
    setPortalUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/client-invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projeto.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro desconhecido");
      if (json.email_sent) {
        setPortalMsg("✓ Link de acesso enviado por e-mail.");
        setTimeout(() => { setPortalMsg(null); setPortalUrl(null); }, 4000);
      } else {
        setPortalMsg(`E-mail não enviado${json.email_error ? `: ${json.email_error}` : ""}. Copie o link abaixo:`);
        setPortalUrl(json.portalUrl);
      }
    } catch (err: any) {
      setPortalMsg(err.message || "Erro ao enviar acesso.");
    } finally {
      setPortalLoading(false);
    }
  }, [projeto]);

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
        supabase
          .from("collaborator_payment_splits")
          .select("id, pagamento_id, member_user_id, amount, status, paid_at")
          .eq("project_id", projeto.id)
          .then(({ data }) => { if (data) setOwnerCollabSplits(data as any[]); });
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


  const handleAddEntregavel = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto || !newEntregavel.titulo.trim()) return;

    const ALLOWED = ["image/png", "image/jpeg", "application/pdf"];
    if (entregavelAnexoTipo === "arquivo" && entregavelArquivos.length > 0) {
      for (const f of entregavelArquivos) {
        if (!ALLOWED.includes(f.type)) { setNotify({ open: true, msg: `Tipo não permitido: ${f.name}. Apenas PNG, JPEG e PDF.` }); return; }
        if (f.size > 10 * 1024 * 1024) { setNotify({ open: true, msg: `Arquivo muito grande: ${f.name}. Limite: 10MB.` }); return; }
      }
    }

    setAddingEntregavel(true);
    try {
      let arquivoUrl: string | null = null;
      let arquivoTipo: string | null = null;
      let arquivosData: EntregavelArquivo[] = [];

      if (entregavelAnexoTipo === "arquivo" && entregavelArquivos.length > 0) {
        const { data: { session: entregavelSession } } = await supabase.auth.getSession();
        if (entregavelSession) {
          const totalSize = entregavelArquivos.reduce((sum, f) => sum + f.size, 0);
          const hasSpace = await checkStorageAvailable(totalSize, entregavelSession.access_token);
          if (!hasSpace) { triggerUpgradeBanner("storage"); setAddingEntregavel(false); return; }
        }

        const uploads = await Promise.all(entregavelArquivos.map(async (f) => {
          const ext = f.name.split(".").pop();
          const path = `${user.id}/${projeto.id}/entregaveis/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("projetos").upload(path, f);
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("projetos").getPublicUrl(path);
          return { url: pub.publicUrl, tipo: f.type, nome: f.name };
        }));
        arquivosData = uploads;
        arquivoUrl = uploads[0].url;
        arquivoTipo = uploads[0].tipo;
      }

      const { data, error } = await supabase
        .from("entregaveis")
        .insert([{
          project_id: projeto.id,
          user_id: user.id,
          titulo: newEntregavel.titulo.trim(),
          descricao: newEntregavel.descricao.trim() || null,
          url: entregavelAnexoTipo === "link" ? newEntregavel.url.trim() || null : null,
          arquivo_url: arquivoUrl,
          arquivo_tipo: arquivoTipo,
          arquivos: arquivosData.length > 0 ? arquivosData : null,
          status: "rascunho",
        }])
        .select("id, titulo, descricao, url, arquivo_url, arquivo_tipo, arquivos, status, feedback_cliente, feedback_imagem_url, feedback_pins, feedback_imagens, reviewed_at, created_at")
        .single();
      if (error) throw error;
      setEntregaveis(prev => [data as Entregavel, ...prev]);
      setNewEntregavel({ titulo: "", descricao: "", url: "" });
      setEntregavelAnexoTipo("nenhum");
      setEntregavelArquivos([]);
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao criar entregável: " + err.message });
    } finally {
      setAddingEntregavel(false);
    }
  }, [projeto, newEntregavel, entregavelAnexoTipo, entregavelArquivos, user]);

  const handleSendEntregavel = useCallback(async (entregavelId: string) => {
    setSendingEntregavelId(entregavelId);
    try {
      const { error } = await supabase
        .from("entregaveis")
        .update({ status: "aguardando_aprovacao" })
        .eq("id", entregavelId);
      if (error) throw error;
      setEntregaveis(prev => prev.map(e => e.id === entregavelId ? { ...e, status: "aguardando_aprovacao" as const } : e));
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao enviar entregável: " + err.message });
    } finally {
      setSendingEntregavelId(null);
    }
  }, []);

  const handleUploadCorrectedFile = useCallback(async (entregavelId: string, file: File) => {
    if (!projeto || !user) return;

    const { data: { session: correctedSession } } = await supabase.auth.getSession();
    if (correctedSession) {
      const hasSpace = await checkStorageAvailable(file.size, correctedSession.access_token);
      if (!hasSpace) { triggerUpgradeBanner("storage"); return; }
    }

    setUploadingCorrectedId(entregavelId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${projeto.id}/entregaveis/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("projetos").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("projetos").getPublicUrl(path);
      const { error } = await supabase
        .from("entregaveis")
        .update({ arquivo_url: pub.publicUrl, arquivo_tipo: file.type })
        .eq("id", entregavelId);
      if (error) throw error;
      setEntregaveis(prev => prev.map(e => e.id === entregavelId ? { ...e, arquivo_url: pub.publicUrl, arquivo_tipo: file.type } : e));
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao enviar arquivo: " + err.message });
    } finally {
      setUploadingCorrectedId(null);
    }
  }, [projeto, user]);

  const handleDeleteEntregavel = useCallback(async (entregavelId: string) => {
    setDeletingEntregavelId(entregavelId);
    try {
      const { error } = await supabase.from("entregaveis").delete().eq("id", entregavelId);
      if (error) throw error;
      setEntregaveis(prev => prev.filter(e => e.id !== entregavelId));
    } catch (err: any) {
      setNotify({ open: true, msg: "Erro ao remover entregável: " + err.message });
    } finally {
      setDeletingEntregavelId(null);
    }
  }, []);

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
  const createdLabel = projeto.created_at ? tempoRelativo(projeto.created_at) : "—";

  return (
    <>

      <div className="flex flex-col flex-1 px-4 sm:px-6 lg:pl-0 lg:pr-6 py-4 sm:py-8 w-full overflow-hidden">
        <div className="flex items-center justify-between gap-3 pb-3">
          <button
            onClick={() => router.push("/dashboard/projetos")}
            className="inline-flex items-center gap-2 text-gray-100 text-[15px] sm:text-[16px] font-medium transition-colors dt-back-btn shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            <span className="hidden xs:inline">Voltar</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => router.push(`/dashboard/projetos/cronometro?projeto_id=${id}`)}
              className="dt-timer-btn"
              title="Iniciar cronômetro do projeto"
            >
              <Timer size={20} />
            </button>
            <label
              className="dt-upload-btn cursor-pointer"
              title={coverUploading ? "Enviando capa…" : "Alterar capa do projeto"}
            >
              {coverUploading
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V5"/><path d="m7 10 5-5 5 5"/><path d="M5 19h14"/></svg>
              }
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} disabled={coverUploading} />
            </label>

            <HeaderProfile />
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex-1 min-h-0 overflow-y-auto pr-0 sm:pr-2 custom-scrollbar">
          <div className="w-full max-w-[980px] mx-auto">
            <div className="dt-card-new" style={{ padding: "30px 34px" }}>
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
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                      <div className="w-[72px] h-[72px] sm:w-[92px] sm:h-[92px] rounded-[16px] sm:rounded-[20px] overflow-hidden shrink-0" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "var(--primary-700)" }}>
                        <Image src={coverSrc} alt="Capa do projeto" width={92} height={92} className="w-full h-full object-cover" />
                      </div>

                      <div className="min-w-0 flex flex-col gap-2 sm:gap-3">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <h1 className="text-[21px] sm:text-[30px] font-bold text-gray-100 leading-tight tracking-tight">{projeto.titulo}</h1>
                          {renderStatusBadgeDetail(projeto.status)}
                        </div>

                        <div className="flex items-center gap-2 text-[13px] sm:text-[15px] text-gray-300">
                          <div className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-full overflow-hidden shrink-0" style={{ border: "1px solid var(--gray-600)" }}>
                            <Image src={clienteFoto} alt={clienteNome} width={30} height={30} className="w-full h-full object-cover" />
                          </div>
                          <span className="truncate">Cliente: <strong className="text-gray-100 font-semibold">{clienteNome}</strong></span>
                          {clienteEmpresa && <><span style={{ color: "var(--gray-500)" }}>·</span><a href="#" className="text-primary-400 hover:text-primary-300 transition-colors">{clienteEmpresa}</a></>}
                        </div>
                      </div>
                    </div>

                    {user && projeto.user_id === user.id && (
                      <div className="flex items-center gap-3 flex-none flex-wrap sm:justify-end">
                        <button
                          type="button"
                          onClick={openEditHeader}
                          className="dt-ghost-btn flex items-center gap-2"
                        >
                          <Pencil size={15} />
                          Editar projeto
                        </button>
                        {(projeto as any).clientes?.email && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              disabled={portalLoading}
                              onClick={handleSendPortalAccess}
                              className="dt-primary-btn flex items-center gap-2 disabled:opacity-60"
                            >
                              <Globe size={16} />
                              {portalLoading ? "Enviando..." : "Enviar portal ao cliente"}
                            </button>
                            {portalMsg && (
                              <span className={`text-[12px] ${portalMsg.startsWith("✓") ? "text-success-medium" : "text-alert-medium"}`}>
                                {portalMsg}
                              </span>
                            )}
                            {portalUrl && (
                              <div className="flex items-center gap-1.5 bg-primary-900 border border-primary-700 rounded-lg px-2 py-1 max-w-[260px]">
                                <span className="text-[11px] text-primary-300 truncate flex-1">{portalUrl}</span>
                                <button
                                  type="button"
                                  onClick={() => { navigator.clipboard.writeText(portalUrl); setNotify({ open: true, msg: "Link copiado!" }); }}
                                  className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 text-[11px]"
                                >
                                  Copiar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4" style={{ margin: "0" }}>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(148,169,173,0.12)" }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--primary-400), var(--primary-500))", boxShadow: "0 0 10px -1px var(--primary-500)" }}
                      />
                    </div>
                    <span className="text-[14px] font-semibold text-gray-300 flex-none" style={{ fontVariantNumeric: "tabular-nums" }}>{pct}% concluído</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden" style={{ border: "1px solid var(--primary-700)", borderRadius: 16, background: "var(--primary-900)" }}>
                    <div className="dt-meta-cell">
                      <span className="dt-meta-label">{user && projeto.user_id === user.id ? "Valor total" : "Seu valor"}</span>
                      <span className="dt-meta-value">
                        {user && projeto.user_id === user.id
                          ? (projeto.orcamento ? projeto.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—")
                          : mySplit && projeto.orcamento
                            ? (mySplit.split_type === "percentage"
                                ? (projeto.orcamento * mySplit.split_value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                : Number(mySplit.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
                            : (projeto.orcamento ? projeto.orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—")
                        }
                      </span>
                      {user && projeto.user_id === user.id && memberSplits.length > 0 && projeto.orcamento && (() => {
                        const totalSplits = memberSplits.reduce((acc, s) => {
                          const val = s.split_type === "percentage" ? projeto.orcamento! * s.split_value / 100 : s.split_value;
                          return acc + val;
                        }, 0);
                        const net = projeto.orcamento - totalSplits;
                        return <span className="text-[12px] text-gray-400">Líquido: <span className="text-success-medium font-medium">{net.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>;
                      })()}
                    </div>

                    <div className="dt-meta-cell" style={{ borderLeft: "1px solid var(--primary-700)" }}>
                      <span className="dt-meta-label">Entrega</span>
                      <span className="dt-meta-value">
                        {projeto.prazo_entrega ? new Date(projeto.prazo_entrega + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </span>
                    </div>

                    <div className="dt-meta-cell" style={{ borderLeft: "1px solid var(--primary-700)" }}>
                      <span className="dt-meta-label">Urgência</span>
                      <div className="dt-meta-value flex items-center gap-2 !text-[17px]">
                        <UrgenciaIndicator nivel={urgProjeto} />
                        <span>{urgProjeto}</span>
                      </div>
                    </div>

                    <div className="dt-meta-cell" style={{ borderLeft: "1px solid var(--primary-700)" }}>
                      <span className="dt-meta-label">Criação</span>
                      <span className="dt-meta-value">{createdLabel}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {user && projeto.user_id === user.id && (
              <div className="dt-card-new mt-6 p-4 sm:p-[26px_30px_30px]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <h2 className="dt-section-title">Adiantamentos</h2>
                    <p className="dt-section-sub">Solicitações de adiantamento ao cliente</p>
                  </div>
                  {!adiantamentos.some((a) => a.status === "solicitado") && (
                    <button
                      type="button"
                      onClick={() => {
                        const meta = user?.user_metadata;
                        setAdiantamentoPixTipo(meta?.pix_chave_tipo || "");
                        setAdiantamentoPixValor(meta?.pix_chave_valor || "");
                        setAdiantamentoPixPais(meta?.pix_chave_pais || "55");
                        setAdiantamentoFeedback(null);
                        setAdiantamentoModal(true);
                      }}
                      className="dt-ghost-btn flex items-center justify-center gap-2 sm:flex-none"
                    >
                      <Plus size={15} />
                      Solicitar adiantamento
                    </button>
                  )}
                </div>

                {adiantamentos.length === 0 ? (
                  <div className="dt-empty-state">
                    <span className="dt-empty-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13h4l1.5 3h7L17 13h4"/><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>
                    </span>
                    <p>Nenhum adiantamento solicitado.</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-primary-700">
                    {adiantamentos.map((ad) => (
                      <AdiantamentoItem
                        key={ad.id}
                        adiantamento={ad}
                        isOwner
                        onConfirmarRecebimento={handleConfirmarRecebimento}
                        onCancelar={handleCancelarAdiantamento}
                        confirmandoId={confirmandoRecebId}
                        cancelandoId={cancelandoAdiantId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

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

            <section className="dt-card-new mt-6 flex flex-col overflow-hidden min-h-[560px]" style={{ padding: "8px 30px 30px" }}>
              <nav className="dt-tabs-nav">
                {([
                  ["descricao", "Descrição"],
                  ["etapas", "Etapas"],
                  ["arquivos", "Arquivos"],
                  ["links", "Links"],
                  ["briefing", "Briefing"],
                  ["entregaveis", "Entregáveis"],
                ] as Array<[TabId, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeTab(key)}
                    className={`dt-tab-btn${activeTab === key ? " is-on" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "descricao" && (
                  <div className="flex flex-col h-full dt-panel">
                    <h2 className="dt-panel-title">Descrição do projeto</h2>

                    <div className="mt-[18px] dt-editor-wrap flex-1 flex flex-col min-h-[220px]">
                      {editor && <EditorToolbar editor={editor} onOpenLinkModal={openLinkModal} onRemoveLink={handleRemoveLink} />}
                      <div className="flex-1 min-h-0" style={{ borderTop: "1px solid var(--primary-700)" }}>
                        <EditorContent
                          editor={editor}
                          className="tiptap px-5 py-4 text-[15px] text-gray-100 max-h-full h-full overflow-y-auto custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={salvarDescricao}
                        disabled={saving}
                        className="dt-primary-btn disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <div className="flex flex-col h-full dt-panel">
                    <h3 className="dt-panel-title">Arquivos</h3>

                    <label className="dt-dropzone-new mt-[18px]">
                      <span className="dt-dropzone-icon-wrap">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V5"/><path d="m7 10 5-5 5 5"/><path d="M5 19h14"/></svg>
                      </span>
                      <span className="text-[16px] text-gray-300">Arraste aqui ou <strong className="text-primary-300 font-semibold">clique para enviar</strong></span>
                      <span className="text-[13px] text-gray-500">PNG, JPG, PDF, ZIP · até 50 MB</span>
                      <input type="file" className="hidden" onChange={handleUpload} />
                    </label>

                    <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {files.length === 0 ? (
                        <p className="text-[15px] text-gray-500">Nenhum arquivo enviado.</p>
                      ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {files.map((f) => (
                            <li key={f.id} className="dt-file-item flex items-center gap-3">
                              <span className="dt-file-icon-wrap dt-file-icon-primary">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>
                              </span>
                              <div className="flex flex-col flex-1 min-w-0">
                                <a href={f.url} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-gray-100 hover:text-primary-300 transition-colors truncate">
                                  {f.nome}
                                </a>
                                <span className="text-[12px] text-gray-500">{new Date(f.created_at).toLocaleString("pt-BR")}</span>
                              </div>
                              <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium flex-none ${f.status === "aprovado" ? "bg-success-medium/15 text-success-medium" : "bg-primary-500/15 text-primary-300"}`}>
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
                  <div className="flex flex-col h-full dt-panel">
                    <h3 className="dt-panel-title">Links</h3>

                    <form onSubmit={addLink} className="flex flex-col md:flex-row items-center gap-3 mt-[18px]">
                      <input
                        type="text"
                        placeholder="Título (opcional)"
                        value={newLink.titulo}
                        onChange={(e) => setNewLink((p) => ({ ...p, titulo: e.target.value }))}
                        className="dt-input-field w-[220px]"
                      />
                      <input
                        type="url"
                        placeholder="https://…"
                        required
                        value={newLink.url}
                        onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))}
                        className="dt-input-field flex-1"
                      />
                      <button type="submit" className="dt-primary-btn flex-none">Adicionar</button>
                    </form>

                    <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {links.length === 0 ? (
                        <p className="text-[15px] text-gray-500">Nenhum link adicionado.</p>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {links.map((l) => (
                            <li key={l.id} className="dt-link-item">
                              {editingLinkId === l.id ? (
                                <div className="flex flex-col gap-2 flex-1">
                                  <input type="text" placeholder="Título (opcional)" value={editingLinkData.titulo} onChange={(e) => setEditingLinkData((p) => ({ ...p, titulo: e.target.value }))} className="dt-input-field" />
                                  <input type="url" placeholder="https://..." value={editingLinkData.url} onChange={(e) => setEditingLinkData((p) => ({ ...p, url: e.target.value }))} className="dt-input-field" />
                                  <div className="flex items-center gap-2 justify-end">
                                    <button type="button" onClick={() => setEditingLinkId(null)} className="dt-ghost-btn text-[13px] py-1.5 px-3">Cancelar</button>
                                    <button type="button" onClick={saveEditingLink} className="dt-primary-btn text-[13px] py-1.5 px-3">Salvar</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="dt-link-icon-wrap">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 14.5 14.5 9.5"/><path d="M8 12 6 14a3.5 3.5 0 0 0 5 5l2-2"/><path d="M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2"/></svg>
                                  </span>
                                  <div className="flex flex-col flex-1 min-w-0 gap-[3px]">
                                    <a href={l.url} target="_blank" rel="noreferrer" className="text-[16px] font-semibold text-gray-100 hover:text-primary-300 transition-colors truncate">
                                      {l.titulo || l.url}
                                    </a>
                                    {l.titulo && <span className="text-[13px] text-gray-400 truncate">{l.url}</span>}
                                    <span className="text-[12px] text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-none">
                                    <button type="button" onClick={() => { setEditingLinkId(l.id); setEditingLinkData({ titulo: l.titulo || "", url: l.url }); }} className="dt-iconmini-btn" title="Editar">
                                      <Pencil size={15} />
                                    </button>
                                    <button type="button" onClick={() => removeLink(l.id)} className="dt-iconmini-btn dt-iconmini-danger" title="Remover">
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "entregaveis" && (() => {
                  if (!subscription.limits.portalClienteCompleto) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                        <div className="w-12 h-12 rounded-2xl bg-primary-800 border border-primary-700 flex items-center justify-center">
                          <Lock size={22} className="text-primary-400" />
                        </div>
                        <div>
                          <h3 className="text-[17px] font-semibold text-gray-100 mb-1">Recurso do plano Profissional</h3>
                          <p className="text-[14px] text-gray-400 max-w-sm leading-relaxed">
                            Entregáveis e aprovações pelo cliente estão disponíveis apenas no plano Profissional.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/dashboard/configuracoes?tab=assinatura")}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl text-[14px] transition-colors"
                        >
                          <Zap size={15} />
                          Ver planos
                        </button>
                      </div>
                    );
                  }
                  const isOwner = projeto?.user_id === user?.id;
                  const counts = {
                    todos: entregaveis.length,
                    aguardando_aprovacao: entregaveis.filter(e => e.status === "aguardando_aprovacao").length,
                    para_alteracao: entregaveis.filter(e => e.status === "para_alteracao").length,
                    aprovado: entregaveis.filter(e => e.status === "aprovado").length,
                  };
                  const filtered = entregavelFilter === "todos" ? entregaveis : entregaveis.filter(e => e.status === entregavelFilter);
                  return (
                  <div className="flex flex-col h-full dt-panel gap-3">
                    <div className="flex items-center justify-between flex-shrink-0 mb-[6px]">
                      <h3 className="dt-panel-title">Entregáveis</h3>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setShowEntregavelForm(v => !v)}
                          className={showEntregavelForm ? "dt-ghost-btn flex items-center gap-2 text-[13px]" : "dt-primary-btn flex items-center gap-2 text-[13px]"}
                        >
                          <Plus size={15} />
                          {showEntregavelForm ? "Cancelar" : "Novo entregável"}
                        </button>
                      )}
                    </div>

                    {isOwner && showEntregavelForm && (
                      <form onSubmit={async (e) => { await handleAddEntregavel(e); setShowEntregavelForm(false); setEntregavelArquivos([]); }} className="flex flex-col gap-2.5 bg-primary-800/80 border border-primary-700 rounded-2xl p-4 flex-shrink-0">
                        <input
                          type="text"
                          placeholder="Título *"
                          required
                          value={newEntregavel.titulo}
                          onChange={e => setNewEntregavel(p => ({ ...p, titulo: e.target.value }))}
                          className="w-full rounded-xl bg-primary-900 border border-primary-700 px-4 py-2.5 text-gray-100 placeholder-gray-500 text-[14px] focus:outline-none focus:border-primary-500 transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Descrição (opcional)"
                          value={newEntregavel.descricao}
                          onChange={e => setNewEntregavel(p => ({ ...p, descricao: e.target.value }))}
                          className="w-full rounded-xl bg-primary-900 border border-primary-700 px-4 py-2.5 text-gray-100 placeholder-gray-500 text-[14px] focus:outline-none focus:border-primary-500 transition-colors"
                        />
                        <div className="flex items-center gap-4">
                          <span className="text-[13px] text-gray-500 shrink-0">Anexo</span>
                          <div className="flex gap-3">
                            {(["nenhum", "link", "arquivo"] as const).map((opt) => (
                              <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-[13px] text-gray-300">
                                <input type="radio" name="anexoTipo" value={opt} checked={entregavelAnexoTipo === opt} onChange={() => { setEntregavelAnexoTipo(opt); setEntregavelArquivos([]); }} className="accent-primary-400" />
                                {opt === "nenhum" ? "Nenhum" : opt === "link" ? "Link externo" : "Arquivo"}
                              </label>
                            ))}
                          </div>
                        </div>
                        {entregavelAnexoTipo === "link" && (
                          <input type="url" placeholder="https://..." value={newEntregavel.url} onChange={e => setNewEntregavel(p => ({ ...p, url: e.target.value }))} className="w-full rounded-xl bg-primary-900 border border-primary-700 px-4 py-2.5 text-gray-100 placeholder-gray-500 text-[14px] focus:outline-none focus:border-primary-500 transition-colors" />
                        )}
                        {entregavelAnexoTipo === "arquivo" && (
                          <div className="flex flex-col gap-2">
                            <label className="flex flex-col items-center justify-center w-full rounded-xl border border-dashed border-primary-600 bg-primary-900 px-4 py-3 text-center cursor-pointer hover:border-primary-500 transition">
                              <span className="text-[13px] text-gray-400">
                                {entregavelArquivos.length > 0
                                  ? <span className="text-primary-300">{entregavelArquivos.length} arquivo{entregavelArquivos.length > 1 ? "s" : ""} selecionado{entregavelArquivos.length > 1 ? "s" : ""}</span>
                                  : <><span className="text-primary-300">Clique para selecionar</span> — PNG, JPEG ou PDF · múltiplos permitidos</>}
                              </span>
                              <input type="file" accept=".png,.jpg,.jpeg,.pdf" multiple className="hidden" onChange={e => setEntregavelArquivos(Array.from(e.target.files || []))} />
                            </label>
                            {entregavelArquivos.length > 0 && (
                              <ul className="flex flex-col gap-1">
                                {entregavelArquivos.map((f, i) => (
                                  <li key={i} className="flex items-center justify-between text-[12px] text-gray-400 bg-primary-800 rounded-lg px-3 py-1.5">
                                    <span className="truncate text-primary-300">{f.name}</span>
                                    <button type="button" onClick={() => setEntregavelArquivos(prev => prev.filter((_, j) => j !== i))} className="ml-2 text-gray-600 hover:text-gray-300 shrink-0">✕</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <button type="submit" disabled={addingEntregavel || (entregavelAnexoTipo === "arquivo" && entregavelArquivos.length === 0)} className="bg-primary-500 hover:bg-primary-400 text-primary-900 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60">
                            {addingEntregavel ? "Criando..." : "Criar entregável"}
                          </button>
                        </div>
                      </form>
                    )}

                    {entregaveis.length > 0 && (
                      <div className="flex gap-[10px] flex-shrink-0 overflow-x-auto pb-0.5 flex-wrap">
                        {([
                          ["todos", "Todos"],
                          ["aguardando_aprovacao", "Aguardando"],
                          ["para_alteracao", "Para alterar"],
                          ["aprovado", "Aprovados"],
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEntregavelFilter(key)}
                            className={`dt-deli-filter-btn${entregavelFilter === key ? " is-on" : ""}`}
                          >
                            {label}
                            {counts[key] > 0 && <span className="dt-deli-count">{counts[key]}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                      {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                          <span className="text-gray-500 text-[13px]">{entregaveis.length === 0 ? "Nenhum entregável criado ainda." : "Nenhum entregável neste filtro."}</span>
                        </div>
                      ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
                          {filtered.map(ent => {
                            const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
                              rascunho:            { label: "Rascunho",     color: "var(--gray-300)",         bg: "rgba(148,169,173,0.07)",    border: "rgba(148,169,173,0.35)" },
                              aguardando_aprovacao:{ label: "Aguardando",   color: "var(--alert-medium)",     bg: "rgba(255,167,38,0.10)",     border: "rgba(255,167,38,0.35)" },
                              aprovado:            { label: "Aprovado",     color: "var(--success-medium)",   bg: "rgba(102,187,106,0.10)",    border: "rgba(102,187,106,0.35)" },
                              para_alteracao:      { label: "Para alterar", color: "var(--error-medium)",     bg: "rgba(239,83,80,0.10)",      border: "rgba(239,83,80,0.35)" },
                            };
                            const badge = statusMap[ent.status] || statusMap["rascunho"];
                            const canSend = ent.status === "rascunho" || ent.status === "para_alteracao";
                            const feedbackImgs = ent.feedback_imagens && ent.feedback_imagens.length > 0 ? ent.feedback_imagens : null;
                            const hasFeedbackImage = ent.status === "para_alteracao" && (!!ent.feedback_imagem_url || !!feedbackImgs);
                            const feedbackThumbUrl = feedbackImgs ? feedbackImgs[0].url : ent.feedback_imagem_url;
                            const files = getEntregavelFiles(ent);
                            return (
                              <li key={ent.id} className="dt-deli-card-new overflow-hidden">
                                {hasFeedbackImage && (
                                  <button type="button" onClick={() => setFeedbackViewerId(ent.id)} className="relative w-full block overflow-hidden group">
                                    <img src={feedbackThumbUrl!} alt="Anotação" className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <span className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[11px] text-white bg-black/50 rounded-md px-2 py-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                      Feedback do cliente{feedbackImgs && feedbackImgs.length > 1 ? ` (${feedbackImgs.length} imagens)` : ""} — clique para ver
                                    </span>
                                  </button>
                                )}
                                {!hasFeedbackImage && files.length > 0 && (
                                  <EntregavelCarousel files={files} />
                                )}

                                <div className="px-[18px] py-4 flex flex-col gap-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-[15px] text-gray-100 font-semibold leading-snug truncate">{ent.titulo}</span>
                                      {ent.descricao && <span className="text-[12px] text-gray-500 mt-0.5 truncate">{ent.descricao}</span>}
                                    </div>
                                    <span style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: "999px", fontSize: 12, fontWeight: 600, padding: "4px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>{badge.label}</span>
                                  </div>

                                  {ent.url && <a href={ent.url} target="_blank" rel="noreferrer" className="text-[12px] text-primary-400 hover:text-primary-300 hover:underline truncate transition-colors">{ent.url}</a>}
                                  {ent.arquivo_url && ent.arquivo_tipo === "application/pdf" && (
                                    <a href={ent.arquivo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-primary-400 hover:text-primary-300 w-fit transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                      Abrir PDF
                                    </a>
                                  )}

                                  {ent.status === "para_alteracao" && ent.feedback_cliente && (
                                    <div className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[12px] text-gray-300">
                                      <span className="text-gray-400 font-medium">Feedback: </span>{ent.feedback_cliente}
                                    </div>
                                  )}

                                  {ent.status === "aprovado" && files.length > 0 && (
                                    <div className="flex items-center gap-2 pt-1 border-t border-primary-700">
                                      {files.length === 1 ? (
                                        <button type="button" onClick={() => downloadFile(files[0].url, files[0].nome)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[12px] transition-colors"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          Baixar arquivo
                                        </button>
                                      ) : (
                                        <>
                                          <button type="button" onClick={() => downloadFile(files[0].url, files[0].nome)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-800 border border-primary-700 text-gray-300 hover:bg-primary-700 text-[12px] transition-colors"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            Baixar atual
                                          </button>
                                          <button type="button" onClick={() => downloadAllAsZip(files, ent.titulo)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[12px] transition-colors"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            Baixar todos ({files.length})
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {isOwner && (
                                    <div className="flex items-center gap-2 pt-1">
                                      {ent.status === "para_alteracao" && ent.arquivo_url && (
                                        <label className="cursor-pointer">
                                          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingCorrectedId === ent.id} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadCorrectedFile(ent.id, f); e.target.value = ""; }} />
                                          <span className="dt-ghost-btn text-[12px] py-1.5 px-3 cursor-pointer">
                                            {uploadingCorrectedId === ent.id ? "Enviando..." : "Substituir arquivo"}
                                          </span>
                                        </label>
                                      )}
                                      <div className="flex-1" />
                                      {ent.status === "rascunho" && (
                                        <button type="button" onClick={() => handleDeleteEntregavel(ent.id)} disabled={deletingEntregavelId === ent.id} className="dt-deli-del-btn flex items-center gap-1.5 text-[13px] disabled:opacity-60">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
                                          {deletingEntregavelId === ent.id ? "..." : "Excluir"}
                                        </button>
                                      )}
                                      {canSend && (
                                        <button type="button" onClick={() => handleSendEntregavel(ent.id)} disabled={sendingEntregavelId === ent.id} className="dt-deli-send-btn flex items-center gap-1.5 text-[13px] disabled:opacity-60">
                                          <Send size={14} />
                                          {sendingEntregavelId === ent.id ? "Enviando..." : ent.status === "para_alteracao" ? "Reenviar" : "Enviar ao cliente"}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {activeTab === "briefing" && (
                  <div className="flex flex-col h-full dt-panel">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-[22px]">
                      <h3 className="dt-panel-title">Briefing</h3>
                      {projeto?.user_id === user?.id && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={handleOpenSendNewBriefing} className="dt-primary-btn flex items-center gap-2 text-[13px]">
                            <Send size={14} /> Novo briefing
                          </button>
                          <button type="button" onClick={() => setAttachBriefingOpen(true)} className="dt-ghost-btn flex items-center gap-2 text-[13px]">
                            <ClipboardList size={14} /> Vincular existente
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                      {projetoBriefingEnvios.length === 0 ? (
                        <p className="text-[15px] text-gray-500">Nenhum briefing neste projeto. Crie um novo ou vincule um já enviado.</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {projetoBriefingEnvios.map(envio => (
                            <div key={envio.id} className="dt-card-inner overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--primary-700)" }}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[15px] text-gray-100 font-semibold">{(envio as any).template?.titulo || "Briefing sem título"}</span>
                                  <span className="text-[12px] text-gray-500">
                                    Enviado em {new Date(envio.created_at).toLocaleDateString("pt-BR")}
                                    {envio.respondido_em ? ` · Respondido em ${new Date(envio.respondido_em).toLocaleDateString("pt-BR")}` : ""}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {(() => {
                                    const respondido = envio.status === "respondido" || !!envio.respondido_em || (envio.briefings_respostas && envio.briefings_respostas.length > 0);
                                    return <span className={`text-[12px] px-2.5 py-1 rounded-full font-medium ${respondido ? "bg-success-medium/10 text-success-medium" : "bg-alert-medium/10 text-alert-medium"}`}>{respondido ? "Respondido" : "Aguardando"}</span>;
                                  })()}
                                  {projeto?.user_id === user?.id && (
                                    <button type="button" onClick={() => handleDetachBriefing(envio.id)} className="text-[12px] px-2.5 py-1 rounded-full text-error-medium bg-error-medium/10 hover:bg-error-medium/20 transition-colors">Desvincular</button>
                                  )}
                                </div>
                              </div>
                              {envio.briefings_respostas && envio.briefings_respostas.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                                  {envio.briefings_respostas.map((r, idx) => (
                                    <div key={r.id || idx} className="dt-brief-card">
                                      <span className="dt-brief-q">{r.pergunta}</span>
                                      <p className="dt-brief-a">{r.resposta || "—"}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="px-4 py-3 text-[13px] text-gray-500">Aguardando resposta do cliente.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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

            {(() => {
              const jaVinculadosNesteProjetoIds = new Set(projetoBriefingEnvios.map(e => e.id));
              const enviosDisponíveis = briefingEnvios.filter(e => !jaVinculadosNesteProjetoIds.has(e.id));
              if (enviosDisponíveis.length === 0) {
                return <p className="text-gray-400 text-[14px]">Nenhum briefing disponível para vincular. Envios já vinculados a este projeto não aparecem aqui.</p>;
              }
              return (
                <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {enviosDisponíveis.map(envio => {
                    const jaEmOutroProjeto = !!(envio.projeto_id && envio.projeto_id !== projeto?.id);
                    const respondido = envio.status === "respondido" || !!envio.respondido_em;
                    return (
                      <li key={envio.id} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${jaEmOutroProjeto ? "bg-primary-900/30 border-primary-700/50 opacity-60" : "bg-primary-900/60 border-primary-700"}`}>
                        <div className="flex flex-col gap-1">
                          <span className="text-[15px] text-gray-100 font-medium">
                            {(envio as any).template?.titulo || "Briefing sem título"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${respondido ? "text-third-400 bg-third-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                              {respondido ? "Respondido" : "Pendente"}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {new Date(envio.created_at).toLocaleDateString("pt-BR")}
                              {jaEmOutroProjeto ? " • Vinculado a outro projeto" : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAttachBriefing(envio.id)}
                          disabled={attachingBriefing || jaEmOutroProjeto}
                          title={jaEmOutroProjeto ? "Este briefing já está vinculado a outro projeto" : undefined}
                          className="ml-3 flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-300 text-primary-900 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {attachingBriefing ? "..." : "Vincular"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>
        </div>
      )}

      {sendNewBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSendNewBriefingOpen(false)}>
          <div className="w-full max-w-lg bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-[18px] text-primary-100 font-semibold">Novo briefing</h4>
                <p className="text-[12px] text-gray-500 mt-0.5">Cria e vincula um novo envio a este projeto</p>
              </div>
              <button onClick={() => setSendNewBriefingOpen(false)} className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-3 py-1 hover:bg-primary-700 text-[13px]">Fechar</button>
            </div>

            <div className="flex flex-col gap-4 mt-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] text-gray-400">Qual formulário usar?</label>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/briefings/novo?projeto_id=${id}`)}
                    className="text-[12px] text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} />
                    Criar novo modelo
                  </button>
                </div>
                {loadingNewBriefingTemplates ? (
                  <div className="text-[13px] text-gray-500">Carregando formulários...</div>
                ) : sendNewBriefingTemplates.length === 0 ? (
                  <div className="text-[13px] text-gray-500">Nenhum formulário criado ainda.</div>
                ) : (
                  <select
                    value={sendNewBriefingTemplateId ?? ""}
                    onChange={e => setSendNewBriefingTemplateId(e.target.value || null)}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-3 py-2.5 text-[13px] text-gray-200 focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Escolha um formulário...</option>
                    {sendNewBriefingTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.titulo}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[13px] text-gray-400 mb-1.5 block">Prazo de resposta (opcional)</label>
                <DatePicker
                  value={sendNewBriefingPrazo}
                  onChange={setSendNewBriefingPrazo}
                  placeholder="Sem prazo"
                />
              </div>

              {projeto?.clientes && (projeto.clientes as any).email && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendNewBriefingSendEmail}
                    onChange={e => setSendNewBriefingSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary-500"
                  />
                  <span className="text-[13px] text-gray-300">
                    Enviar e-mail ao cliente ({(projeto.clientes as any).email})
                  </span>
                </label>
              )}

              {sendNewBriefingError && (
                <p className="text-[13px] text-red-400">{sendNewBriefingError}</p>
              )}

              <button
                type="button"
                onClick={handleSendNewBriefing}
                disabled={sendingNewBriefing || !sendNewBriefingTemplateId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={15} />
                {sendingNewBriefing ? "Enviando..." : "Criar briefing"}
              </button>
            </div>
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

      {adiantamentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-primary-800 border border-primary-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-700">
              <div>
                <div className="text-[16px] font-semibold text-gray-100">Solicitar adiantamento</div>
                <div className="text-[12px] text-gray-400 mt-0.5">O cliente receberá uma notificação por e-mail e no portal.</div>
              </div>
              <button onClick={() => setAdiantamentoModal(false)} className="p-2 rounded-lg hover:bg-primary-700 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-[13px] text-gray-300 mb-1.5">Valor do adiantamento (R$)</label>
                <input
                  type="number"
                  value={adiantamentoValor}
                  onChange={(e) => setAdiantamentoValor(e.target.value)}
                  placeholder="0,00"
                  min="0.01"
                  max={projeto?.orcamento ?? undefined}
                  step="0.01"
                  className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none"
                />
                {projeto?.orcamento && (
                  <p className="text-[11px] text-gray-500 mt-1">Máximo: {Number(projeto.orcamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] text-gray-300 mb-1.5">Motivo do adiantamento</label>
                <textarea
                  value={adiantamentoMotivo}
                  onChange={(e) => setAdiantamentoMotivo(e.target.value)}
                  placeholder="Explique ao cliente por que você precisa desse adiantamento..."
                  rows={3}
                  className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[13px] text-gray-300 mb-1.5">Tipo da chave PIX</label>
                <div className="relative">
                  <select
                    value={adiantamentoPixTipo}
                    onChange={(e) => { setAdiantamentoPixTipo(e.target.value); setAdiantamentoPixValor(""); }}
                    className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 appearance-none outline-none"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Telefone</option>
                    <option value="cpf_cnpj">CPF / CNPJ</option>
                    <option value="aleatoria">Chave aleatória</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">▼</span>
                </div>
              </div>

              {adiantamentoPixTipo === "email" && (
                <div>
                  <label className="block text-[13px] text-gray-300 mb-1.5">E-mail da chave PIX</label>
                  <input
                    type="email"
                    value={adiantamentoPixValor}
                    onChange={(e) => setAdiantamentoPixValor(e.target.value)}
                    placeholder="seupix@email.com"
                    className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none"
                  />
                </div>
              )}

              {adiantamentoPixTipo === "cpf_cnpj" && (
                <div>
                  <label className="block text-[13px] text-gray-300 mb-1.5">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={adiantamentoPixValor}
                    onChange={(e) => setAdiantamentoPixValor(formatCpfCnpjAd(e.target.value))}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                    className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none"
                  />
                </div>
              )}

              {adiantamentoPixTipo === "telefone" && (
                <div>
                  <label className="block text-[13px] text-gray-300 mb-1.5">Telefone da chave PIX</label>
                  <div className="flex gap-2">
                    <div ref={adiantamentoPixPaisRef} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setAdiantamentoPixPaisOpen((o) => !o)}
                        className="flex items-center gap-2 bg-primary-900 border border-primary-700 rounded-xl px-3 py-2.5 text-[14px] text-gray-100 hover:border-primary-500 focus:outline-none transition-colors"
                      >
                        <span className="text-[18px] leading-none">
                          {PAISES_PIX.find((p) => p.code === adiantamentoPixPais)?.flag}
                        </span>
                        <span className="text-gray-400 text-[13px]">
                          {PAISES_PIX.find((p) => p.code === adiantamentoPixPais)?.dial}
                        </span>
                        <span className="text-gray-600 text-[10px]">▼</span>
                      </button>

                      {adiantamentoPixPaisOpen && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 bg-primary-800 border border-primary-700 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                          {PAISES_PIX.map((p) => (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => {
                                setAdiantamentoPixPais(p.code);
                                setAdiantamentoPixValor("");
                                setAdiantamentoPixPaisOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-left hover:bg-primary-700 transition-colors ${p.code === adiantamentoPixPais ? "text-primary-300 bg-primary-700/50" : "text-gray-200"}`}
                            >
                              <span className="text-[20px] leading-none">{p.flag}</span>
                              <span className="flex-1">{p.label}</span>
                              <span className="text-gray-500 text-[13px]">{p.dial}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="tel"
                      value={adiantamentoPixValor}
                      onChange={(e) => setAdiantamentoPixValor(formatPixPhoneAd(e.target.value, adiantamentoPixPais))}
                      placeholder={pixPhonePlaceholderAd(adiantamentoPixPais)}
                      maxLength={pixPhoneMaxLenAd(adiantamentoPixPais)}
                      className="flex-1 bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {adiantamentoPixTipo === "aleatoria" && (
                <div>
                  <label className="block text-[13px] text-gray-300 mb-1.5">Chave aleatória</label>
                  <input
                    type="text"
                    value={adiantamentoPixValor}
                    onChange={(e) => setAdiantamentoPixValor(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none"
                  />
                </div>
              )}

              {adiantamentoFeedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] ${adiantamentoFeedback.ok ? "bg-third-500/10 text-third-400 border border-third-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  <AlertCircle size={14} />
                  {adiantamentoFeedback.msg}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setAdiantamentoModal(false)} className="flex-1 py-2.5 rounded-xl border border-primary-600 text-[14px] text-gray-300 hover:bg-primary-700 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSolicitarAdiantamento}
                  disabled={adiantamentoLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-60 text-[14px] font-semibold text-primary-900 transition-colors"
                >
                  <Send size={14} />
                  {adiantamentoLoading ? "Enviando..." : "Solicitar adiantamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* ── Detail page redesign ── */

        /* Top bar */
        .dt-back-btn {
          padding: 12px 20px;
          border-radius: 13px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          transition: border-color .2s;
        }
        .dt-back-btn:hover { border-color: var(--primary-600); }

        .dt-timer-btn {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          color: var(--primary-900);
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
          box-shadow: 0 0 0 5px rgba(30,182,232,0.10), 0 10px 24px -10px rgba(30,182,232,0.8);
          transition: transform .2s;
        }
        .dt-timer-btn:hover { transform: scale(1.06); }

        .dt-upload-btn {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          color: var(--gray-200);
          transition: border-color .2s, color .2s;
        }
        .dt-upload-btn:hover { border-color: var(--primary-500); color: var(--primary-300); }

        /* Cards */
        .dt-card-new {
          border-radius: 22px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
        }
        .dt-card-inner {
          border-radius: 14px;
          border: 1px solid var(--primary-700);
          background: var(--primary-900);
        }

        /* Buttons */
        .dt-ghost-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          color: var(--gray-100);
          cursor: pointer;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid var(--primary-600);
          background: var(--primary-800);
          transition: border-color .2s, color .2s;
          white-space: nowrap;
        }
        .dt-ghost-btn:hover { border-color: var(--primary-500); color: var(--gray-100); }

        .dt-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          padding: 13px 22px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 10px 24px -12px rgba(30,182,232,0.8);
          transition: transform .2s, box-shadow .2s;
          white-space: nowrap;
        }
        .dt-primary-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(30,182,232,0.9); }

        /* Meta cells */
        .dt-meta-cell {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .dt-meta-label { font-size: 14px; color: var(--gray-400); }
        .dt-meta-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--gray-100);
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Section title */
        .dt-section-title { margin: 0; font-size: 21px; font-weight: 600; color: var(--gray-100); letter-spacing: -0.01em; }
        .dt-section-sub { margin: 6px 0 0; font-size: 14px; color: var(--gray-400); }

        /* Empty state */
        .dt-empty-state {
          margin-top: 24px;
          padding: 44px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          border: 1px dashed var(--primary-700);
          border-radius: 16px;
        }
        .dt-empty-icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          color: var(--gray-400);
          background: var(--primary-700);
          border: 1px solid var(--primary-600);
        }
        .dt-empty-state p { margin: 0; font-size: 15px; color: var(--gray-500); }

        /* Tabs */
        .dt-tabs-nav {
          display: flex;
          gap: 6px;
          border-bottom: 1px solid var(--primary-700);
          padding-top: 14px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .dt-tab-btn {
          position: relative;
          font-family: inherit;
          font-size: 16px;
          font-weight: 500;
          color: var(--gray-400);
          cursor: pointer;
          padding: 14px 18px;
          border: 0;
          background: none;
          transition: color .2s;
        }
        @media (max-width: 639px) {
          .dt-tab-btn { font-size: 14px; padding: 10px 10px; }
          .dt-meta-cell { padding: 14px 14px; }
          .dt-meta-label { font-size: 12px; }
          .dt-meta-value { font-size: 16px; }
          .dt-timer-btn, .dt-upload-btn { width: 42px; height: 42px; }
          .dt-back-btn { padding: 10px 14px; }
          .dt-ghost-btn { padding: 10px 14px; font-size: 13.5px; }
          .dt-primary-btn { padding: 11px 16px; font-size: 13.5px; }
          .dt-section-title { font-size: 18px; }
          .dt-panel-title { font-size: 18px !important; }
        }
        .dt-tab-btn:hover { color: var(--gray-100); }
        .dt-tab-btn.is-on { color: var(--primary-300); }
        .dt-tab-btn.is-on::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: -1px;
          height: 2.5px;
          border-radius: 3px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 0 10px -1px var(--primary-500);
        }

        /* Panel common */
        .dt-panel { padding-top: 26px; min-height: 400px; }
        .dt-panel-title { margin: 0; font-size: 22px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.01em; }

        /* Editor */
        .dt-editor-wrap {
          border: 1px solid var(--primary-700);
          border-radius: 16px;
          overflow: hidden;
          background: var(--primary-900);
        }

        /* Dropzone */
        .dt-dropzone-new {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          width: 100%;
          cursor: pointer;
          padding: 36px 20px;
          border-radius: 16px;
          border: 1.5px dashed var(--primary-600);
          background: rgba(30,182,232,0.03);
          font-family: inherit;
          transition: border-color .2s, background .2s;
        }
        .dt-dropzone-new:hover { border-color: var(--primary-500); background: rgba(30,182,232,0.06); }
        .dt-dropzone-icon-wrap {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          border-radius: 14px;
          color: var(--primary-300);
          background: rgba(30,182,232,0.10);
          border: 1px solid rgba(30,182,232,0.3);
        }

        /* File items */
        .dt-file-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--primary-700);
          background: var(--primary-900);
          transition: border-color .2s;
        }
        .dt-file-item:hover { border-color: var(--primary-600); }
        .dt-file-icon-wrap {
          flex: none;
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
        }
        .dt-file-icon-primary { color: var(--primary-300); background: rgba(30,182,232,0.10); border: 1px solid rgba(30,182,232,0.25); }

        /* Input field */
        .dt-input-field {
          height: 52px;
          padding: 0 18px;
          border-radius: 13px;
          border: 1px solid var(--primary-700);
          background: var(--primary-900);
          color: var(--gray-100);
          font-family: inherit;
          font-size: 15px;
          outline: none;
          transition: border-color .2s;
        }
        .dt-input-field::placeholder { color: var(--gray-500); }
        .dt-input-field:focus { border-color: var(--primary-600); }

        /* Link items */
        .dt-link-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1px solid var(--primary-700);
          background: var(--primary-900);
          transition: border-color .2s;
        }
        .dt-link-item:hover { border-color: var(--primary-600); }
        .dt-link-icon-wrap {
          flex: none;
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          color: var(--primary-300);
          background: rgba(30,182,232,0.10);
          border: 1px solid rgba(30,182,232,0.25);
        }

        /* Icon mini buttons */
        .dt-iconmini-btn {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 0;
          background: none;
          color: var(--gray-400);
          cursor: pointer;
          transition: background .2s, color .2s;
        }
        .dt-iconmini-btn:hover { background: rgba(148,169,173,0.1); color: var(--gray-100); }
        .dt-iconmini-danger:hover { background: rgba(239,83,80,0.10); color: var(--error-medium); }

        /* Briefing cards */
        .dt-brief-card {
          padding: 20px 22px;
          border-radius: 14px;
          border: 1px solid var(--primary-700);
          background: var(--primary-900);
        }
        .dt-brief-q {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary-300);
          display: block;
        }
        .dt-brief-a {
          margin: 10px 0 0;
          font-size: 15px;
          color: var(--gray-200);
          line-height: 1.5;
        }

        /* Entregáveis */
        .dt-deli-card-new {
          border-radius: 18px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          overflow: hidden;
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .dt-deli-card-new:hover { border-color: var(--primary-600); transform: translateY(-2px); box-shadow: 0 16px 40px -24px rgba(0,0,0,0.5); }

        .dt-deli-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: var(--gray-300);
          cursor: pointer;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          transition: border-color .2s, color .2s, background .2s;
        }
        .dt-deli-filter-btn:hover { border-color: var(--primary-600); color: var(--gray-100); }
        .dt-deli-filter-btn.is-on { color: var(--primary-300); border-color: var(--primary-500); background: rgba(30,182,232,0.08); }
        .dt-deli-count {
          display: grid;
          place-items: center;
          min-width: 22px;
          height: 22px;
          padding: 0 7px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(148,169,173,0.10);
          color: var(--gray-300);
        }
        .dt-deli-filter-btn.is-on .dt-deli-count { background: rgba(30,182,232,0.15); color: var(--primary-200); }

        .dt-deli-del-btn {
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: var(--gray-400);
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--primary-700);
          background: none;
          transition: color .2s, border-color .2s, background .2s;
        }
        .dt-deli-del-btn:hover { color: var(--error-medium); border-color: rgba(239,83,80,0.35); background: rgba(239,83,80,0.08); }

        .dt-deli-send-btn {
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          padding: 9px 15px;
          border-radius: 10px;
          border: 0;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 8px 20px -12px rgba(30,182,232,0.8);
          transition: transform .2s;
        }
        .dt-deli-send-btn:hover { transform: translateY(-1px); }

        /* Etapas */
        .dt-step-item { display: flex; flex-direction: column; }
        .dt-step-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1px solid var(--primary-700);
          background: var(--primary-900);
          transition: border-color .2s;
        }
        .dt-step-row:hover { border-color: var(--primary-600); }
        .dt-step-row.is-done { opacity: 0.7; }
        .dt-check-box {
          flex: none;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          border: 1.5px solid var(--primary-600);
          color: var(--primary-900);
          cursor: pointer;
          transition: border-color .2s, background .2s, box-shadow .2s;
          background: none;
        }
        .dt-check-box.on {
          border-color: var(--primary-500);
          background: var(--primary-400);
          box-shadow: 0 0 12px -3px var(--primary-500);
        }
        .dt-check-box.sm { width: 24px; height: 24px; border-radius: 7px; }
        .dt-check-box:hover:not(.on) { border-color: var(--primary-400); }
        .dt-assignee-chip {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          color: var(--gray-300);
          padding: 5px 14px 5px 5px;
          border-radius: 999px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          white-space: nowrap;
        }
        .dt-step-edit-btn {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 0;
          background: none;
          color: var(--gray-500);
          cursor: pointer;
          transition: background .2s, color .2s;
        }
        .dt-step-edit-btn:hover { background: rgba(148,169,173,0.10); color: var(--gray-100); }
        .dt-substep-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: 10px;
          transition: background .15s;
        }
        .dt-substep-row:hover { background: rgba(148,169,173,0.04); }

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
          color: var(--gray-100);
          font-style: italic;
        }
        .tiptap a {
          color: var(--primary-400);
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

      {feedbackViewerId && (() => {
        const ent = entregaveis.find(e => e.id === feedbackViewerId);
        if (!ent) return null;
        return (
          <FeedbackImageViewer
            entregavel={ent}
            onClose={() => setFeedbackViewerId(null)}
          />
        );
      })()}
    </>
  );
}

function getEntregavelFiles(ent: { arquivo_url?: string | null; arquivo_tipo?: string | null; arquivos?: Array<{ url: string; tipo: string; nome: string }> | null; titulo?: string }): Array<{ url: string; tipo: string; nome: string }> {
  if (ent.arquivos && ent.arquivos.length > 0) return ent.arquivos;
  if (ent.arquivo_url) return [{ url: ent.arquivo_url, tipo: ent.arquivo_tipo || "", nome: ent.titulo || "arquivo" }];
  return [];
}

async function downloadFile(url: string, nome: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

async function downloadAllAsZip(files: Array<{ url: string; nome: string }>, zipName: string) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  await Promise.all(files.map(async (f, i) => {
    try {
      const res = await fetch(f.url);
      const blob = await res.blob();
      const ext = f.nome.includes(".") ? "" : ".png";
      zip.file(`${String(i + 1).padStart(2, "0")}-${f.nome}${ext}`, blob);
    } catch {}
  }));
  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${zipName}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function EntregavelCarousel({ files, onClickImage }: {
  files: Array<{ url: string; tipo: string; nome: string }>;
  onClickImage?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const total = files.length;

  function goTo(newIdx: number) {
    setVisible(false);
    setTimeout(() => { setIdx(newIdx); setVisible(true); }, 120);
  }

  const current = files[idx];
  if (!current) return null;
  const isImage = current.tipo.startsWith("image/");

  return (
    <div className="relative w-full overflow-hidden bg-primary-900 group">
      <div className={`transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}>
        {isImage ? (
          <div className="relative cursor-pointer" onClick={onClickImage}>
            <img src={current.url} alt={current.nome} className="w-full aspect-video object-cover" />
            {onClickImage && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        ) : (
          <a href={current.url} target="_blank" rel="noreferrer" className="flex items-center justify-center aspect-video bg-primary-800 hover:bg-primary-700 transition-colors">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-[12px] truncate max-w-[80%]">{current.nome}</span>
            </div>
          </a>
        )}
      </div>

      {total > 1 && (
        <>
          <button type="button" onClick={() => goTo((idx - 1 + total) % total)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" onClick={() => goTo((idx + 1) % total)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {files.map((_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[11px] text-white bg-black/50 rounded-md px-2 py-0.5 z-10">{idx + 1}/{total}</span>
        </>
      )}
    </div>
  );
}

function FeedbackImageViewer({ entregavel: ent, onClose }: {
  entregavel: Entregavel;
  onClose: () => void;
}) {
  type FeedbackImg = { url: string; pins: Array<{ xPct: number; yPct: number; text: string }> };

  const images: FeedbackImg[] = ent.feedback_imagens && ent.feedback_imagens.length > 0
    ? ent.feedback_imagens
    : ent.feedback_imagem_url
    ? [{ url: ent.feedback_imagem_url, pins: ent.feedback_pins ?? [] }]
    : [];

  const [imgIdx, setImgIdx] = useState(0);
  const [openPinId, setOpenPinId] = useState<number | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const total = images.length;
  const current = images[imgIdx];
  const pins = current?.pins ?? [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (total > 1) {
        if (e.key === "ArrowLeft") setImgIdx(i => (i - 1 + total) % total);
        if (e.key === "ArrowRight") setImgIdx(i => (i + 1) % total);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  useEffect(() => { setOpenPinId(null); }, [imgIdx]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-[16px] font-semibold text-gray-100">{ent.titulo}</p>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Feedback do cliente{total > 1 ? ` — imagem ${imgIdx + 1} de ${total}` : ""}
          </p>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 bg-primary-800 border border-primary-700 rounded-lg text-[13px] text-gray-300 hover:text-gray-100 transition-colors">
          Fechar
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4 gap-4" onClick={e => e.stopPropagation()}>
        {total > 1 && (
          <button type="button"
            onClick={() => setImgIdx(i => (i - 1 + total) % total)}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-800/90 hover:bg-primary-700 border border-primary-600 text-gray-200 flex items-center justify-center transition-colors shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}

        <div ref={imgContainerRef} className="relative inline-block" style={{ lineHeight: 0, maxWidth: "calc(100vw - 8rem)", maxHeight: "calc(100vh - 8rem)" }}>
          <img
            src={current.url}
            alt="Feedback anotado"
            className="block object-contain rounded-xl"
            style={{ maxWidth: "100%", maxHeight: "calc(100vh - 8rem)" }}
          />

          {pins.map((pin, idx) => (
            <div
              key={idx}
              style={{ position: "absolute", left: `${pin.xPct}%`, top: `${pin.yPct}%`, transform: "translate(-50%, -50%)", zIndex: 20 }}
            >
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setOpenPinId(openPinId === idx ? null : idx); }}
                className="w-7 h-7 rounded-full bg-primary-500 border-2 border-primary-300 text-primary-900 text-[11px] font-bold flex items-center justify-center shadow-lg hover:scale-110 transition-transform select-none"
              >
                {idx + 1}
              </button>
              {openPinId === idx && (
                <div
                  className="absolute bg-primary-800 border border-primary-600 rounded-xl shadow-2xl p-3 z-40"
                  style={{
                    width: 240,
                    ...(pin.xPct > 65 ? { right: "calc(100% + 10px)" } : { left: "calc(100% + 10px)" }),
                    ...(pin.yPct > 70 ? { bottom: "50%", transform: "translateY(50%)" } : { top: "50%", transform: "translateY(-50%)" }),
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">Ponto {idx + 1}</p>
                  <p className="text-[13px] text-gray-200 leading-relaxed">{pin.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {total > 1 && (
          <button type="button"
            onClick={() => setImgIdx(i => (i + 1) % total)}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-800/90 hover:bg-primary-700 border border-primary-600 text-gray-200 flex items-center justify-center transition-colors shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => setImgIdx(i)}
              className={`rounded-full transition-all ${i === imgIdx ? "w-5 h-2 bg-primary-400" : "w-2 h-2 bg-primary-700 hover:bg-primary-500"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdiantamentoStatusBadge({ status }: { status: AdiantamentoStatus }) {
  const map: Record<AdiantamentoStatus, { label: string; cls: string }> = {
    solicitado: { label: "Aguardando resposta", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    aprovado:   { label: "Aprovado — aguardando pagamento", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    recusado:   { label: "Recusado", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
    pago:       { label: "Recebido", cls: "text-third-400 bg-third-400/10 border-third-400/20" },
    cancelado:  { label: "Cancelado", cls: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
  };
  const { label, cls } = map[status] ?? map.cancelado;
  return <span className={`text-[11px] px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

function AdiantamentoItem({
  adiantamento: ad,
  isOwner,
  onConfirmarRecebimento,
  onCancelar,
  confirmandoId,
  cancelandoId,
}: {
  adiantamento: Adiantamento;
  isOwner: boolean;
  onConfirmarRecebimento: (id: string) => void;
  onCancelar: (id: string) => void;
  confirmandoId: string | null;
  cancelandoId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  function copiarPix() {
    if (!ad.pix_chave) return;
    navigator.clipboard.writeText(ad.pix_chave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <AdiantamentoStatusBadge status={ad.status} />
            <span className="text-[12px] text-gray-500">{fmtDate(ad.solicitado_em)}</span>
          </div>
          <div className="text-[17px] text-gray-100 font-semibold">{fmtCurrency(Number(ad.valor))}</div>
          <div className="text-[13px] text-gray-400 mt-1 leading-relaxed">{ad.motivo}</div>
        </div>
      </div>

      {ad.pix_chave && (ad.status === "aprovado" || ad.status === "solicitado") && (
        <div className="flex items-center gap-3 bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 mb-0.5">Chave PIX</p>
            <p className="text-[13px] text-primary-300 font-medium truncate">{ad.pix_chave}</p>
          </div>
          <button
            onClick={copiarPix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 text-[12px] text-gray-200 transition-colors flex-shrink-0"
          >
            {copied ? <Check size={13} className="text-third-400" /> : <Copy size={13} />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}

      {ad.status === "recusado" && ad.feedback_cliente && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] text-gray-500 mb-0.5">Motivo do cliente</p>
            <p className="text-[13px] text-red-300">{ad.feedback_cliente}</p>
          </div>
        </div>
      )}

      {isOwner && ad.status === "aprovado" && (
        <button
          onClick={() => onConfirmarRecebimento(ad.id)}
          disabled={confirmandoId === ad.id}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-third-500/15 hover:bg-third-500/25 border border-third-500/30 text-[13px] font-medium text-third-400 transition-colors disabled:opacity-60"
        >
          <Check size={15} />
          {confirmandoId === ad.id ? "Confirmando..." : "Confirmar recebimento"}
        </button>
      )}

      {isOwner && ad.status === "solicitado" && (
        <button
          onClick={() => onCancelar(ad.id)}
          disabled={cancelandoId === ad.id}
          className="text-[12px] text-gray-500 hover:text-red-400 transition-colors text-left"
        >
          {cancelandoId === ad.id ? "Cancelando..." : "Cancelar solicitação"}
        </button>
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
                            <div className="relative">
                              <select
                                value={editSplitType}
                                onChange={(e) => setEditSplitType(e.target.value as any)}
                                className="appearance-none bg-primary-800 border border-gray-700 rounded-lg pl-3 pr-8 py-1.5 text-[13px] text-gray-100 cursor-pointer focus:outline-none focus:border-primary-500"
                              >
                                <option value="percentage">%</option>
                                <option value="fixed">R$ fixo</option>
                              </select>
                              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={editSplitValue}
                              onChange={(e) => setEditSplitValue(e.target.value)}
                              placeholder={editSplitType === "percentage" ? "50" : "2500"}
                              className="w-24 bg-primary-800 border border-gray-700 rounded-lg px-3 py-1.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                <div className="mt-1 pt-2 border-t border-gray-700">
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">Pago</span>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 pt-2 border-t border-gray-700">
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
                            <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-gray-700">
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

              <div className="flex flex-col gap-3 pt-3 border-t border-gray-700">
                <span className="text-[13px] text-gray-300">Convidar novo colaborador</span>
                <form onSubmit={handleCreateInvite} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      required
                      placeholder="Email do colaborador"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 bg-primary-900 border border-gray-700 rounded-xl px-4 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={inviteSplitType}
                        onChange={(e) => setInviteSplitType(e.target.value as any)}
                        className="appearance-none bg-primary-900 border border-gray-700 rounded-xl pl-3 pr-8 py-2 text-[13px] text-gray-100 cursor-pointer focus:outline-none focus:border-primary-500"
                      >
                        <option value="percentage">% do total</option>
                        <option value="fixed">Valor fixo</option>
                      </select>
                      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={inviteSplitValue}
                      onChange={(e) => setInviteSplitValue(e.target.value)}
                      placeholder={inviteSplitType === "percentage" ? "50" : "2500"}
                      className="w-28 bg-primary-900 border border-gray-700 rounded-xl px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
  const router = useRouter();
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

  const doneTasks = tasks.filter(isTaskDone).length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full dt-panel">
      <div className="flex items-start justify-between gap-4 mb-[22px]">
        <div>
          <h2 className="dt-panel-title">Etapas do projeto</h2>
          {totalTasks > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-[180px] h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(148,169,173,0.12)" }}>
                <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--primary-400), var(--primary-500))", boxShadow: "0 0 10px -1px var(--primary-500)" }} />
              </div>
              <span className="text-[14px] text-gray-400" style={{ fontVariantNumeric: "tabular-nums" }}>{doneTasks}/{totalTasks} concluídas</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setNewTaskForm({ titulo: "", due_date: "", assigned_to: user?.id || "", subtasks: [] });
            setNewTaskOpen((v) => !v);
          }}
          className="dt-ghost-btn flex items-center gap-2 text-[14px] flex-none"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
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
          <p className="text-[15px] text-gray-500">Nenhuma tarefa criada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => {
              const subs = subtasksByTask[t.id] || [];
              const done = isTaskDone(t);
              const canToggle = isOwner || t.user_id === user?.id;
              const assigneeName = getAssigneeName(t.user_id);
              const assigneeAvatar = getAssigneeAvatar(t.user_id);
              const assigneeInitials = assigneeName ? assigneeName.slice(0, 2).toUpperCase() : "?";

              return (
                <li key={t.id} className="dt-step-item flex flex-col">
                  <div className={`dt-step-row${done ? " is-done" : ""}`}>
                    <button
                      type="button"
                      onClick={() => canToggle && toggleTaskCompletion(t)}
                      className={`dt-check-box${done ? " on" : ""}${!canToggle ? " opacity-40 cursor-not-allowed" : ""}`}
                      title={canToggle ? undefined : "Você só pode concluir suas próprias tarefas"}
                    >
                      {done && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12.5 4.5 4.5L19 7"/>
                        </svg>
                      )}
                    </button>

                    <span className={`flex-1 text-[17px] font-semibold${done ? " line-through text-gray-500" : " text-gray-100"}`}>
                      {t.titulo}
                    </span>

                    <div className="flex items-center gap-3 shrink-0">
                      {assigneeName && (
                        <span className="dt-assignee-chip">
                          <span className="w-[26px] h-[26px] rounded-full overflow-hidden shrink-0 bg-primary-700 flex items-center justify-center text-[10px] text-gray-300 font-medium">
                            {assigneeAvatar
                              ? <img src={assigneeAvatar} alt={assigneeName} className="w-full h-full object-cover" />
                              : <span>{assigneeInitials}</span>}
                          </span>
                          {assigneeName}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="text-[13px] text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {(isOwner || t.user_id === user?.id) && (
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/tarefas/editar/${t.id}`)}
                          className="dt-step-edit-btn"
                          title="Editar tarefa"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {subs.length > 0 && (
                    <ul className="ml-[46px] flex flex-col mt-1">
                      {subs.map((s) => (
                        <li key={s.id} className="dt-substep-row">
                          <span className="text-gray-600 select-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/></svg>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSubtaskCompletion(s)}
                            className={`dt-check-box sm${s.concluida ? " on" : ""}`}
                          >
                            {s.concluida && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m5 12.5 4.5 4.5L19 7"/>
                              </svg>
                            )}
                          </button>
                          <span className={`text-[15px]${s.concluida ? " line-through text-gray-500" : " text-gray-300"}`}>
                            {s.titulo}
                          </span>
                        </li>
                      ))}
                    </ul>
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
        ""
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

