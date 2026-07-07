"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Pencil, Trash2, MoreVertical, ChevronDown,
  ClipboardList, FileText, Calendar, Copy, Send, Eye, Plus, X,
  Star, Heart, Zap, Flag, Bookmark, MessageCircle, Hash, Link, Info, AlertCircle, Settings,
  User, Users, Briefcase, Folder, Image as ImageIcon, Clock, MapPin, Globe, Sun, Moon, Smile,
  ThumbsUp, Award, Layout, LayoutGrid, List, Target, TrendingUp, PieChart, BarChart, Activity,
  Box, Package, Truck, ShoppingBag, CreditCard, DollarSign, Monitor, Smartphone, Tablet,
  Camera, Video, Music, Mic, Speaker, Headphones, Bell, Mail, Phone, Share2, Printer,
  Download, Upload, Cloud, Database, Server, Lock, Unlock, Key, Shield, Eye as EyeIcon,
} from "lucide-react";

const ICON_LIST: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; color?: string }>> = {
  FileText, Star, Heart, Zap, Flag, Bookmark, MessageCircle, Hash, Link, Info, AlertCircle,
  Settings, User, Users, Briefcase, Folder, ImageIcon, Calendar, Clock, MapPin, Globe, Sun,
  Moon, Smile, ThumbsUp, Award, Layout, LayoutGrid, List, Target, TrendingUp, PieChart,
  BarChart, Activity, Box, Package, Truck, ShoppingBag, CreditCard, DollarSign, Monitor,
  Smartphone, Tablet, Camera, Video, Music, Mic, Speaker, Headphones, Bell, Mail, Phone,
  Send, Share2, Printer, Download, Upload, Cloud, Database, Server, Lock, Unlock, Key,
  Shield, EyeIcon,
};
import DatePicker from "@/components/DatePicker";
import HeaderProfile from "@/components/HeaderProfile";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";

const BRIEFINGS_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo aos Briefings!", content: "Briefings são formulários personalizados que você envia ao cliente para coletar todas as informações necessárias antes de iniciar um projeto." },
  { target: "#tour-add-btn", placement: "bottom", skipBeacon: true, title: "Criar um briefing", content: "Clique aqui para criar um novo template de briefing. Você define as perguntas, tipos de campo (texto, múltipla escolha, arquivo etc.) e as envia ao cliente por link." },
  { target: "body", placement: "center", skipBeacon: true, title: "Fluxo do briefing", content: "1. Você cria um template → 2. Envia ao cliente → 3. O cliente preenche e envia → 4. Você visualiza as respostas na tela do projeto." },
  { target: "body", placement: "center", skipBeacon: true, title: "Dica", content: "Você pode reutilizar o mesmo template em múltiplos projetos e clientes, economizando tempo na coleta de informações." },
];
import { useAuth } from "@/contexts/AuthContext";
import { formatarDataCurta, tempoRelativo } from "@/lib/utils";
import { SkeletonList } from "@/components/Skeleton";

type Cliente = {
  id: string;
  nome: string | null;
  empresa: string | null;
  foto_url?: string | null;
  email?: string | null;
};

type Projeto = {
  id: string;
  titulo: string;
  cliente_id: string | null;
  clientes?: Cliente | null;
};

type BriefingTemplate = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  created_at: string;
  updated_at: string | null;
  campos_count?: number;
  card_bg_color?: string | null;
  card_text_color?: string | null;
  cover_icon?: string | null;
  cover_icon_color?: string | null;
};

type BriefingEnvio = {
  id: string;
  user_id: string;
  template_id: string;
  projeto_id: string | null;
  status: string | null;
  prazo_resposta: string | null;
  created_at: string;
  respondido_em: string | null;
  token: string | null;
  email_enviado: boolean;
  template?: {
    id: string;
    titulo: string;
  } | null;
  projeto?: {
    id: string;
    titulo: string;
    cliente_id: string | null;
    clientes?: Cliente | null;
  } | null;
};

type BriefingResposta = {
  id: string;
  user_id: string;
  projeto_id: string | null;
  created_at: string;
  pergunta: string;
  resposta: string | null;
};

type BriefingCampo = {
  id: string;
  ordem: number;
  tipo: "short_text" | "long_text" | "multiple_choice" | "checkboxes" | string;
  titulo_pergunta: string;
  descricao_pergunta: string | null;
  opcoes: string[] | null;
  obrigatorio: boolean;
};

type FiltroEnvioStatus = "" | "pendente" | "respondido";
type FiltroEmail = "" | "com_email" | "sem_email";
type ActiveTab = "modelos" | "envios";
type ViewMode = "list" | "board";

function classificarEnvio(
  envio: BriefingEnvio,
  respostasPorProjeto: Record<string, number>
): "pendente" | "respondido" {
  const raw = String(envio.status || "").toLowerCase();
  if (raw === "respondido" || raw === "concluido") return "respondido";
  if (envio.respondido_em) return "respondido";
  if (envio.projeto_id && respostasPorProjeto[envio.projeto_id]) {
    return "respondido";
  }
  return "pendente";
}

export default function BriefingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const [templates, setTemplates] = useState<BriefingTemplate[]>([]);
  const [envios, setEnvios] = useState<BriefingEnvio[]>([]);
  const [respostas, setRespostas] = useState<BriefingResposta[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroEnvioStatus, setFiltroEnvioStatus] =
    useState<FiltroEnvioStatus>("");
  const [filtroEmail, setFiltroEmail] = useState<FiltroEmail>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("modelos");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const isMobile = useIsMobile();
  const effectiveViewMode: ViewMode = isMobile ? "list" : viewMode;

  useEffect(() => {
    const saved = localStorage.getItem("briefingsViewMode");
    if (saved === "list" || saved === "board") {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("briefingsActiveTab");
    if (saved === "modelos" || saved === "envios") {
      setActiveTab(saved as ActiveTab);
    }
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("briefingsViewMode", mode);
  };

  const changeActiveTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    localStorage.setItem("briefingsActiveTab", tab);
  };



  const [openMenuEnvioId, setOpenMenuEnvioId] = useState<string | null>(null);
  const [boardMenuCoords, setBoardMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  const [openMenuTemplateId, setOpenMenuTemplateId] = useState<string | null>(
    null
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"projeto" | "email">("projeto");
  const [sendSelectedTemplateId, setSendSelectedTemplateId] =
    useState<string | null>(null);
  const [sendSelectedProjetos, setSendSelectedProjetos] = useState<string[]>([]);
  const [sendEmailProjetoId, setSendEmailProjetoId] = useState<string | null>(null);
  const [sendPrazo, setSendPrazo] = useState("");
  const [sendSearchProjeto, setSendSearchProjeto] = useState("");
  const [emailManual, setEmailManual] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<"form" | "success">("form");
  const [linksGerados, setLinksGerados] = useState<{ projetoTitulo: string; link: string | null; emailStatus: string | null; emailEnviado: boolean }[]>([]);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<BriefingTemplate | null>(
    null
  );
  const [viewCampos, setViewCampos] = useState<BriefingCampo[]>([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templatesToDelete, setTemplatesToDelete] = useState<string[]>([]);
  const [deletingTemplates, setDeletingTemplates] = useState(false);

  const [confirmExcluirEnvioId, setConfirmExcluirEnvioId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { user: authUser } = useAuth();

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  useEffect(() => {
    async function carregar() {
      if (!authUser) return;
      setLoading(true);

      const u = authUser;
      setUser(u);

      const [
        { data: templatesData, error: templatesError },
        { data: camposData, error: camposError },
        { data: enviosData, error: enviosError },
        { data: respostasData, error: respostasError },
        { data: projetosData, error: projetosError },
      ] = await Promise.all([
        supabase
          .from("briefings_templates")
          .select("*")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("briefings_campos")
          .select("id, template_id")
          .eq("user_id", u.id),
        supabase
          .from("briefings_envios")
          .select(
            `
            id,
            user_id,
            template_id,
            projeto_id,
            status,
            prazo_resposta,
            created_at,
            respondido_em,
            token,
            email_enviado,
            template:template_id (
              id,
              titulo
            ),
            projeto:projeto_id (
              id,
              titulo,
              cliente_id,
              clientes:cliente_id (
                id,
                nome,
                empresa,
                foto_url
              )
            )
          `
          )
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("briefings_respostas")
          .select("*")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("projetos")
          .select(
            `
            id,
            titulo,
            cliente_id,
            clientes:cliente_id (
              id,
              nome,
              empresa,
              foto_url,
              email
            )
          `
          )
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),
      ]);

      if (
        templatesError ||
        camposError ||
        enviosError ||
        respostasError ||
        projetosError
      ) {
        setErro(
          templatesError?.message ||
            camposError?.message ||
            enviosError?.message ||
            respostasError?.message ||
            projetosError?.message ||
            "Erro ao carregar dados."
        );
        setTemplates([]);
        setEnvios([]);
        setRespostas([]);
        setProjetos([]);
        setLoading(false);
        return;
      }

      const countsMap: Record<string, number> = {};
      (camposData || []).forEach((c: any) => {
        const tid = String(c.template_id);
        countsMap[tid] = (countsMap[tid] || 0) + 1;
      });

      const normalizadosTemplates = (templatesData || []).map((t: any) => ({
        id: String(t.id),
        user_id: String(t.user_id),
        titulo: t.titulo as string,
        descricao: t.descricao ?? null,
        created_at: t.created_at as string,
        updated_at: t.updated_at ?? null,
        campos_count: countsMap[String(t.id)] || 0,
        card_bg_color: t.card_bg_color ?? "#0f172a",
        card_text_color: t.card_text_color ?? "#ffffff",
        cover_icon: t.cover_icon ?? null,
        cover_icon_color: t.cover_icon_color ?? null,
      })) as BriefingTemplate[];

      const normalizadosEnvios = (enviosData || []).map((e: any) => {
        let projeto: BriefingEnvio["projeto"] | null = null;
        if (e.projeto) {
          let cliente: Cliente | null = null;
          if (Array.isArray(e.projeto.clientes)) {
            const c = e.projeto.clientes[0];
            if (c) {
              cliente = {
                id: String(c.id),
                nome: c.nome ?? null,
                empresa: c.empresa ?? null,
                foto_url: c.foto_url ?? null,
              };
            }
          } else if (e.projeto.clientes) {
            cliente = {
              id: String(e.projeto.clientes.id),
              nome: e.projeto.clientes.nome ?? null,
              empresa: e.projeto.clientes.empresa ?? null,
              foto_url: e.projeto.clientes.foto_url ?? null,
            };
          }

          projeto = {
            id: String(e.projeto.id),
            titulo: e.projeto.titulo as string,
            cliente_id: e.projeto.cliente_id
              ? String(e.projeto.cliente_id)
              : null,
            clientes: cliente,
          };
        }

        return {
          id: String(e.id),
          user_id: String(e.user_id),
          template_id: String(e.template_id),
          projeto_id: e.projeto_id ? String(e.projeto_id) : null,
          status: e.status ?? null,
          prazo_resposta: e.prazo_resposta ?? null,
          created_at: e.created_at as string,
          respondido_em: e.respondido_em ?? null,
          token: e.token ?? null,
          email_enviado: !!e.email_enviado,
          template: e.template
            ? {
                id: String(e.template.id),
                titulo: e.template.titulo as string,
              }
            : null,
          projeto,
        } as BriefingEnvio;
      });

      const normalizadosRespostas = (respostasData || []).map((r: any) => ({
        id: String(r.id),
        user_id: String(r.user_id),
        projeto_id: r.projeto_id ? String(r.projeto_id) : null,
        created_at: r.created_at as string,
        pergunta: r.pergunta as string,
        resposta: r.resposta ?? null,
      })) as BriefingResposta[];

      const normalizadosProjetos = (projetosData || []).map((p: any) => {
        let cliente: Cliente | null = null;

        if (Array.isArray(p.clientes)) {
          const c = p.clientes[0];
          if (c) {
            cliente = {
              id: String(c.id),
              nome: c.nome ?? null,
              empresa: c.empresa ?? null,
              foto_url: c.foto_url ?? null,
              email: c.email ?? null,
            };
          }
        } else if (p.clientes) {
          cliente = {
            id: String(p.clientes.id),
            nome: p.clientes.nome ?? null,
            empresa: p.clientes.empresa ?? null,
            foto_url: p.clientes.foto_url ?? null,
            email: p.clientes.email ?? null,
          };
        }

        return {
          id: String(p.id),
          titulo: p.titulo as string,
          cliente_id: p.cliente_id ? String(p.cliente_id) : null,
          clientes: cliente,
        } as Projeto;
      });

      setTemplates(normalizadosTemplates);
      setEnvios(normalizadosEnvios);
      setRespostas(normalizadosRespostas);
      setProjetos(normalizadosProjetos);
      setErro(null);
      setLoading(false);
    }

    carregar();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel("briefings-envios-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "briefings_envios", filter: `user_id=eq.${authUser.id}` },
        (payload) => {
          const updated = payload.new as any;
          setEnvios((prev) =>
            prev.map((e) =>
              e.id === updated.id
                ? { ...e, status: updated.status ?? e.status, respondido_em: updated.respondido_em ?? e.respondido_em }
                : e
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;

      const isTemplateMenu =
        target.closest("[data-template-menu]") ||
        target.closest("[data-template-menu-trigger]");
      if (!isTemplateMenu) {
        setOpenMenuTemplateId(null);
      }

      const isEnvioMenu =
        target.closest("[data-envio-menu]") ||
        target.closest("[data-envio-menu-trigger]");
      if (!isEnvioMenu) {
        setOpenMenuEnvioId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const respostasPorProjeto = useMemo(() => {
    const map: Record<string, number> = {};
    respostas.forEach((r) => {
      if (!r.projeto_id) return;
      map[r.projeto_id] = (map[r.projeto_id] || 0) + 1;
    });
    return map;
  }, [respostas]);

  const totalTemplates = templates.length;
  const totalEnvios = envios.length;

  const enviosFiltrados = useMemo(() => {
    return envios.filter((envio) => {
      const tipo = classificarEnvio(envio, respostasPorProjeto);
      if (filtroEnvioStatus === "pendente" && tipo !== "pendente") return false;
      if (filtroEnvioStatus === "respondido" && tipo !== "respondido") return false;
      if (filtroEmail === "com_email" && !envio.email_enviado) return false;
      if (filtroEmail === "sem_email" && envio.email_enviado) return false;
      return true;
    });
  }, [envios, filtroEnvioStatus, filtroEmail, respostasPorProjeto]);

  function statusEnvioVisual(envio: BriefingEnvio) {
    const tipo = classificarEnvio(envio, respostasPorProjeto);
    if (tipo === "respondido") {
      return {
        label: "Respondido",
        bg: "bg-emerald-400",
        text: "text-primary-900",
      };
    }
    return {
      label: "Pendente",
      bg: "bg-amber-400",
      text: "text-primary-900",
    };
  }

  function projetoDoEnvio(envio: BriefingEnvio): Projeto | null {
    if (envio.projeto) {
      return {
        id: envio.projeto.id,
        titulo: envio.projeto.titulo,
        cliente_id: envio.projeto.cliente_id,
        clientes: envio.projeto.clientes || null,
      };
    }
    if (!envio.projeto_id) return null;
    return projetos.find((p) => p.id === envio.projeto_id) || null;
  }

  async function excluirEnvioConfirmado(id: string) {
    await supabase.from("briefings_envios").delete().eq("id", id);
    setEnvios((prev) => prev.filter((e) => e.id !== id));
    setConfirmExcluirEnvioId(null);
  }

  function excluirEnvio(id: string) {
    setConfirmExcluirEnvioId(id);
  }

  async function enviarEmailBriefing(envio: BriefingEnvio) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { showToast("Usuário não autenticado."); return; }

    if (!envio.token) {
      showToast("Este envio não possui link público. Exclua e recrie o briefing para gerar o link.");
      return;
    }

    try {
      const res = await fetch("/api/briefings/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ envio_id: envio.id }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        showToast(data.error || "Erro ao enviar e-mail.");
        return;
      }

      setEnvios((prev) =>
        prev.map((e) => (e.id === envio.id ? { ...e, email_enviado: true } : e))
      );
      showToast(`E-mail enviado para ${data.cliente_email}.`);
    } catch {
      showToast("Erro de conexão ao enviar e-mail.");
    }
  }

  function copiarLinkBriefing(envio: BriefingEnvio) {
    if (!envio.token) {
      showToast("Este envio não possui link público. Exclua e recrie o briefing para gerar o link.");
      return;
    }
    const link = `${window.location.origin}/briefing/${envio.token}`;
    navigator.clipboard.writeText(link).then(() => showToast("Link copiado!"));
  }

  async function reenviarEnvio(envio: BriefingEnvio) {
    await enviarEmailBriefing(envio);
  }

  function abrirModalEnvio(templateId?: string) {
    setSendSelectedTemplateId(templateId || null);
    setSendMode("projeto");
    setSendSelectedProjetos([]);
    setSendEmailProjetoId(null);
    setSendPrazo("");
    setSendSearchProjeto("");
    setEmailManual("");
    setSendError(null);
    setModalStep("form");
    setLinksGerados([]);
    setSendModalOpen(true);
  }

  function fecharModalEnvio() {
    if (sending) return;
    setSendModalOpen(false);
  }

  function toggleProjetoSelecionado(id: string) {
    setSendSelectedProjetos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  const projetosFiltradosModal = useMemo(() => {
    const termo = sendSearchProjeto.trim().toLowerCase();
    if (!termo) return projetos;
    return projetos.filter((p) => {
      const cliente = p.clientes;
      const alvo =
        `${p.titulo} ${cliente?.nome || ""} ${cliente?.empresa || ""}`.toLowerCase();
      return alvo.includes(termo);
    });
  }, [projetos, sendSearchProjeto]);

  function normalizarEnvioInserido(e: any): BriefingEnvio {
    let projeto: BriefingEnvio["projeto"] | null = null;
    if (e.projeto) {
      let cliente: Cliente | null = null;
      const raw = Array.isArray(e.projeto.clientes) ? e.projeto.clientes[0] : e.projeto.clientes;
      if (raw) {
        cliente = {
          id: String(raw.id),
          nome: raw.nome ?? null,
          empresa: raw.empresa ?? null,
          foto_url: raw.foto_url ?? null,
          email: raw.email ?? null,
        };
      }
      projeto = {
        id: String(e.projeto.id),
        titulo: e.projeto.titulo as string,
        cliente_id: e.projeto.cliente_id ? String(e.projeto.cliente_id) : null,
        clientes: cliente,
      };
    }
    return {
      id: String(e.id),
      user_id: String(e.user_id),
      template_id: String(e.template_id),
      projeto_id: e.projeto_id ? String(e.projeto_id) : null,
      status: e.status ?? null,
      prazo_resposta: e.prazo_resposta ?? null,
      created_at: e.created_at as string,
      respondido_em: e.respondido_em ?? null,
      token: e.token ?? null,
      email_enviado: !!e.email_enviado,
      template: e.template ? { id: String(e.template.id), titulo: e.template.titulo as string } : null,
      projeto,
    };
  }

  const SELECT_ENVIO_INSERT = `
    id, user_id, template_id, projeto_id, status, prazo_resposta,
    created_at, respondido_em, token, email_enviado,
    template:template_id(id, titulo),
    projeto:projeto_id(id, titulo, cliente_id,
      clientes:cliente_id(id, nome, empresa, foto_url, email))
  `;

  async function handleEnviarBriefingModal() {
    if (!user) { setSendError("Usuário não autenticado."); return; }

    const templateId = sendSelectedTemplateId;
    if (!templateId) { setSendError("Selecione um modelo de briefing."); return; }

    if (sendMode === "projeto" && sendSelectedProjetos.length === 0) {
      setSendError("Selecione pelo menos um projeto.");
      return;
    }
    if (sendMode === "email" && !emailManual.trim()) {
      setSendError("Informe o e-mail do cliente.");
      return;
    }

    setSendError(null);
    setSending(true);

    try {
      const rows =
        sendMode === "projeto"
          ? sendSelectedProjetos.map((pid) => {
              const p = projetos.find((proj) => proj.id === pid);
              return {
                user_id: user.id,
                template_id: templateId,
                projeto_id: pid,
                cliente_id: p?.cliente_id || null,
                status: "pendente",
                prazo_resposta: sendPrazo || null,
                token: crypto.randomUUID(),
                email_enviado: false,
              };
            })
          : [{
              user_id: user.id,
              template_id: templateId,
              projeto_id: sendEmailProjetoId || null,
              cliente_id: sendEmailProjetoId
                ? (projetos.find((p) => p.id === sendEmailProjetoId)?.cliente_id || null)
                : null,
              status: "pendente",
              prazo_resposta: sendPrazo || null,
              token: crypto.randomUUID(),
              email_enviado: false,
            }];

      const { data: inserted, error: insertError } = await supabase
        .from("briefings_envios")
        .insert(rows)
        .select(SELECT_ENVIO_INSERT);

      if (insertError) {
        setSendError(insertError.message || "Erro ao criar briefing.");
        setSending(false);
        return;
      }

      const normalizados = (inserted || []).map(normalizarEnvioInserido);

      const links: { projetoTitulo: string; link: string | null; emailStatus: string | null; emailEnviado: boolean }[] =
        normalizados.map((e) => ({
          projetoTitulo: e.projeto?.titulo || (sendMode === "email" ? "Briefing" : "Projeto"),
          link: e.token ? `${window.location.origin}/briefing/${e.token}` : null,
          emailStatus: null,
          emailEnviado: false,
        }));

      const sessionData = await supabase.auth.getSession();
      const accessToken = sessionData.data.session?.access_token;

      for (let i = 0; i < normalizados.length; i++) {
        const envio = normalizados[i];
        const emailOverride = sendMode === "email" ? emailManual.trim() : undefined;

        try {
          const res = await fetch("/api/briefings/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ envio_id: envio.id, email_override: emailOverride }),
          });
          const data = await res.json();
          if (data.ok) {
            links[i].emailStatus = `E-mail enviado para ${data.cliente_email}`;
            links[i].emailEnviado = true;
            normalizados[i] = { ...normalizados[i], email_enviado: true };
          } else {
            links[i].emailStatus = data.error || "Erro ao enviar e-mail";
          }
        } catch {
          links[i].emailStatus = "Erro de conexão ao enviar e-mail";
        }
      }

      setEnvios((prev) => [...normalizados, ...prev]);
      setLinksGerados(links);
      setSending(false);
      setModalStep("success");
    } catch (err: any) {
      setSendError(err.message || "Erro inesperado ao enviar briefing.");
      setSending(false);
    }
  }

  async function updateEnvioStatus(envioId: string, novoStatus: string) {
    const { error } = await supabase
      .from("briefings_envios")
      .update({ status: novoStatus })
      .eq("id", envioId);

    if (error) {
      console.error("Erro ao atualizar status do envio:", error);
      showToast("Erro ao atualizar status. Tente novamente.");
      return;
    }

    setEnvios((prev) =>
      prev.map((e) => (e.id === envioId ? { ...e, status: novoStatus } : e))
    );
  }

  function renderBoardView() {
    const enviosPorColuna = {
      pendente: enviosFiltrados.filter((e) => classificarEnvio(e, respostasPorProjeto) === "pendente"),
      respondido: enviosFiltrados.filter((e) => classificarEnvio(e, respostasPorProjeto) === "respondido"),
    };

    const handleDrop = (e: React.DragEvent, targetCol: string) => {
      e.preventDefault();
      const envioId = e.dataTransfer.getData("application/x-envio-id");
      if (!envioId) return;
      const envio = envios.find((ev) => ev.id === envioId);
      if (!envio) return;
      const currentStatus = classificarEnvio(envio, respostasPorProjeto);
      if (currentStatus === targetCol) return;
      updateEnvioStatus(envioId, targetCol === "respondido" ? "respondido" : "pendente");
    };

    const EnvioBoardCard = ({ envio }: { envio: BriefingEnvio }) => {
      const projeto = projetoDoEnvio(envio);
      const cliente = projeto?.clientes || null;
      const foto = cliente?.foto_url || null;
      const enviadoEm = formatarDataCurta(envio.created_at);
      const prazoResStr = envio.prazo_resposta ? formatarDataCurta(envio.prazo_resposta) : null;
      const isRespondido = classificarEnvio(envio, respostasPorProjeto) === "respondido";

      return (
        <div
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/x-envio-id", envio.id)}
          className="group relative rounded-2xl border border-gray-700 p-5 cursor-move transition-colors duration-200 hover:border-primary-600"
          style={{ background: 'var(--primary-800)' }}
        >
          <div className="flex items-center gap-3 mb-3.5">
            <div
              className="flex-none grid place-items-center w-9 h-9 rounded-full overflow-hidden border"
              style={{ color: 'var(--primary-300)', background: 'rgba(30,182,232,0.08)', borderColor: 'rgba(30,182,232,0.22)' }}
            >
              {foto ? (
                <Image src={foto} alt="Cliente" width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                <User size={18} />
              )}
            </div>
            <span className="flex-1 text-[16px] font-semibold text-gray-100 truncate">
              {cliente?.nome || "Cliente"}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full flex-none"
              style={isRespondido
                ? { background: 'var(--success-medium)', boxShadow: '0 0 10px -1px var(--success-medium)' }
                : { background: 'var(--alert-medium)', boxShadow: '0 0 10px -1px var(--alert-medium)' }
              }
            />
          </div>

          <p className="m-0 mb-4 text-[16px] font-medium text-gray-100 truncate">
            {envio.template?.titulo || "Briefing"}
          </p>

          <div className="flex items-center justify-between pt-3.5 border-t border-gray-700">
            <div className="flex flex-col gap-[3px] text-[13.5px] text-gray-500">
              <span>Enviado: <strong className="text-gray-300 font-semibold">{enviadoEm}</strong></span>
              {prazoResStr && <span>Prazo: <strong className="text-gray-300 font-semibold">{prazoResStr}</strong></span>}
            </div>
            <div className="relative" data-envio-menu-trigger>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const newId = openMenuEnvioId === envio.id ? null : envio.id;
                  if (newId) {
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const dropdownH = 220;
                    if (spaceBelow < dropdownH + 16) {
                      setBoardMenuCoords({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right });
                    } else {
                      setBoardMenuCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                    }
                  }
                  setOpenMenuEnvioId(newId);
                }}
                className="grid place-items-center w-[34px] h-[34px] rounded-[10px] border-0 bg-transparent text-gray-400 cursor-pointer transition-colors opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-gray-100"
              >
                <MoreVertical size={16} />
              </button>
              {openMenuEnvioId === envio.id && boardMenuCoords && (
                <div
                  className="w-[200px] p-2 rounded-2xl border border-gray-600 animate-fade-in"
                  style={{ position: 'fixed', ...(boardMenuCoords.top !== undefined ? { top: boardMenuCoords.top } : { bottom: boardMenuCoords.bottom }), right: boardMenuCoords.right, zIndex: 9999, background: 'var(--primary-800)', boxShadow: '0 30px 70px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(30,182,232,0.06)' }}
                  data-envio-menu
                >
                  {isRespondido && (
                    <button
                      type="button"
                      onClick={() => { setOpenMenuEnvioId(null); router.push(`/dashboard/briefings/${envio.id}/respostas`); }}
                      className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[14.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                    >
                      <Eye size={16} className="text-gray-400" /> Ver respostas
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setOpenMenuEnvioId(null); enviarEmailBriefing(envio); }}
                    className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[14.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                  >
                    <Send size={15} className="text-gray-400" /> {envio.email_enviado ? "Reenviar e-mail" : "Enviar e-mail"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpenMenuEnvioId(null); copiarLinkBriefing(envio); }}
                    className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[14.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                  >
                    <Copy size={15} className="text-gray-400" /> Copiar link
                  </button>
                  <div className="h-px my-1.5 mx-2 bg-gray-700" />
                  <button
                    type="button"
                    onClick={() => { setOpenMenuEnvioId(null); excluirEnvio(envio.id); }}
                    className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[14.5px] font-medium text-error-medium border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(239,83,80,0.10)]"
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    const BoardCol = ({ id, title, isPrimary }: { id: "pendente" | "respondido"; title: string; isPrimary: boolean }) => (
      <section
        className="flex-1 flex flex-col gap-4 p-[18px] rounded-[18px] border border-gray-700 min-w-[260px]"
        style={{ background: 'var(--primary-900)' }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => handleDrop(e, id)}
      >
        <div className="flex items-center gap-2.5 pb-3.5 border-b border-gray-700">
          <span
            className="w-[9px] h-[9px] rounded-full flex-none"
            style={isPrimary
              ? { background: 'var(--primary-400)', boxShadow: '0 0 10px -1px var(--primary-500)' }
              : { background: 'var(--success-medium)', boxShadow: '0 0 10px -1px var(--success-medium)' }
            }
          />
          <span className="flex-1 text-[16.5px] font-semibold text-gray-100">{title}</span>
          <span
            className="text-[14px] font-semibold text-gray-400 min-w-[26px] h-[26px] px-2 rounded-[8px] grid place-items-center"
            style={{ background: 'rgba(148,169,173,0.08)' }}
          >
            {enviosPorColuna[id].length}
          </span>
        </div>
        <div className="flex flex-col gap-3.5">
          {enviosPorColuna[id].map((envio) => (
            <EnvioBoardCard key={envio.id} envio={envio} />
          ))}
        </div>
      </section>
    );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        <BoardCol id="pendente" title="Enviado" isPrimary={true} />
        <BoardCol id="respondido" title="Respondido" isPrimary={false} />
      </div>
    );
  }

  async function duplicarTemplate(templateId: string) {
    if (!user) return;
    
    const original = templates.find(t => t.id === templateId);
    if (!original) return;

    const novoTitulo = `${original.titulo} (Cópia)`;

    try {
      const { data: newTplData, error: newTplError } = await supabase
        .from("briefings_templates")
        .insert({
          user_id: user.id,
          titulo: novoTitulo,
          descricao: original.descricao,
          card_bg_color: original.card_bg_color,
          card_text_color: original.card_text_color
        })
        .select()
        .single();

      if (newTplError) throw newTplError;

      const { data: camposOriginais, error: camposError } = await supabase
        .from("briefings_campos")
        .select("*")
        .eq("template_id", original.id);

      if (camposError) throw camposError;

      if (camposOriginais && camposOriginais.length > 0) {
        const novosCampos = camposOriginais.map((c: any) => ({
          template_id: newTplData.id,
          user_id: user.id,
          ordem: c.ordem,
          tipo: c.tipo,
          titulo_pergunta: c.titulo_pergunta,
          descricao_pergunta: c.descricao_pergunta,
          opcoes: c.opcoes,
          obrigatorio: c.obrigatorio
        }));

        const { error: insertCamposError } = await supabase
          .from("briefings_campos")
          .insert(novosCampos);
        
        if (insertCamposError) throw insertCamposError;
      }

      const novoTemplate: BriefingTemplate = {
        id: String(newTplData.id),
        user_id: String(newTplData.user_id),
        titulo: newTplData.titulo,
        descricao: newTplData.descricao,
        created_at: newTplData.created_at,
        updated_at: newTplData.updated_at,
        campos_count: original.campos_count,
        card_bg_color: newTplData.card_bg_color,
        card_text_color: newTplData.card_text_color
      };

      setTemplates(prev => [novoTemplate, ...prev]);

    } catch (err: any) {
      showToast("Erro ao duplicar modelo: " + err.message);
    }
  }

  async function abrirModalVisualizar(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId) || null;
    setViewTemplate(tpl);
    setViewCampos([]);
    setViewError(null);
    setViewModalOpen(true);

    if (!user) {
      setViewError("Usuário não autenticado.");
      return;
    }

    setViewLoading(true);

    const { data, error } = await supabase
      .from("briefings_campos")
      .select(
        `
        id,
        ordem,
        tipo,
        titulo_pergunta,
        descricao_pergunta,
        opcoes,
        obrigatorio
      `
      )
      .eq("user_id", user.id)
      .eq("template_id", templateId)
      .order("ordem", { ascending: true });

    if (error) {
      setViewError(error.message || "Erro ao carregar perguntas do briefing.");
      setViewLoading(false);
      return;
    }

    const camposNormalizados: BriefingCampo[] = (data || []).map((c: any) => ({
      id: String(c.id),
      ordem: c.ordem ?? 0,
      tipo: c.tipo as any,
      titulo_pergunta: c.titulo_pergunta as string,
      descricao_pergunta: c.descricao_pergunta ?? null,
      opcoes: Array.isArray(c.opcoes)
        ? c.opcoes.map((o: any) => String(o))
        : null,
      obrigatorio: !!c.obrigatorio,
    }));

    setViewCampos(camposNormalizados);
    setViewLoading(false);
  }

  function fecharModalVisualizar() {
    if (viewLoading) return;
    setViewModalOpen(false);
    setViewTemplate(null);
    setViewCampos([]);
    setViewError(null);
  }

  function labelTipoCampo(tipo: BriefingCampo["tipo"]) {
    switch (tipo) {
      case "short_text":
        return "Resposta curta";
      case "long_text":
        return "Parágrafo";
      case "multiple_choice":
        return "Múltipla escolha";
      case "checkboxes":
        return "Múltiplas seleções";
      default:
        return "Campo";
    }
  }

  function toggleTemplateSelecionado(id: string) {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  }

  function abrirModalExcluirModelos(ids: string[]) {
    if (!ids || ids.length === 0) return;
    setTemplatesToDelete(ids);
    setDeleteModalOpen(true);
    setOpenMenuTemplateId(null);
  }

  function fecharModalExcluirModelos() {
    if (deletingTemplates) return;
    setDeleteModalOpen(false);
    setTemplatesToDelete([]);
  }

  async function confirmarExcluirModelos() {
    if (!templatesToDelete.length) return;
    setDeletingTemplates(true);

    try {
      await supabase
        .from("briefings_campos")
        .delete()
        .in("template_id", templatesToDelete);

      const { error } = await supabase
        .from("briefings_templates")
        .delete()
        .in("id", templatesToDelete);

      if (error) {
        showToast(error.message || "Erro ao excluir modelos.");
        setDeletingTemplates(false);
        return;
      }

      setTemplates((prev) =>
        prev.filter((t) => !templatesToDelete.includes(t.id))
      );
      setSelectedTemplateIds((prev) =>
        prev.filter((id) => !templatesToDelete.includes(id))
      );
      setDeletingTemplates(false);
      setDeleteModalOpen(false);
      setTemplatesToDelete([]);
      setSelectionMode(false);
    } catch (err: any) {
      showToast(err.message || "Erro inesperado ao excluir modelos.");
      setDeletingTemplates(false);
    }
  }

  const algumModeloSelecionado = selectedTemplateIds.length > 0;

  return (
    <>
      <PageTour name="briefings" steps={BRIEFINGS_TOUR_STEPS} />

      <div className="relative flex flex-col flex-1 gap-6 px-4 sm:px-6 lg:pl-0 lg:pr-6 py-4 sm:py-8 overflow-hidden">
        <div className="pointer-events-none absolute rounded-full z-0" style={{ width: 520, height: 520, right: -180, top: -180, background: 'radial-gradient(circle, rgba(30,182,232,0.10), transparent 70%)', filter: 'blur(100px)' }} />
        <div className="pointer-events-none absolute rounded-full z-0" style={{ width: 460, height: 460, right: -160, bottom: -200, background: 'radial-gradient(circle, rgba(16,66,83,0.45), transparent 70%)', filter: 'blur(100px)' }} />

        <header className="relative z-20 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="grid place-items-center flex-none w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-[13px] border border-gray-700 text-gray-200 transition-all duration-200 hover:border-primary-500 hover:text-primary-300"
                style={{ background: 'var(--primary-800)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
                </svg>
              </button>

              <div className="hidden lg:flex gap-1.5 p-1.5 rounded-[15px] border border-gray-700 min-w-0" style={{ background: 'var(--primary-800)' }}>
                <button
                  type="button"
                  onClick={() => changeActiveTab("modelos")}
                  className={`whitespace-nowrap px-5 py-[11px] rounded-[11px] text-[15.5px] font-medium border-0 cursor-pointer transition-all duration-200 ${activeTab === "modelos" ? "" : "bg-transparent text-gray-400 hover:text-gray-100"}`}
                  style={activeTab === "modelos" ? { background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))', color: 'var(--primary-900)', boxShadow: '0 6px 16px -6px rgba(30,182,232,0.7)' } : {}}
                >
                  Modelos de briefing
                </button>
                <button
                  type="button"
                  onClick={() => changeActiveTab("envios")}
                  className={`whitespace-nowrap px-5 py-[11px] rounded-[11px] text-[15.5px] font-medium border-0 cursor-pointer transition-all duration-200 ${activeTab === "envios" ? "" : "bg-transparent text-gray-400 hover:text-gray-100"}`}
                  style={activeTab === "envios" ? { background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))', color: 'var(--primary-900)', boxShadow: '0 6px 16px -6px rgba(30,182,232,0.7)' } : {}}
                >
                  Briefings enviados
                </button>
              </div>
            </div>

            <div className="lg:hidden flex-none">
              <HeaderProfile />
            </div>
          </div>

          <div className="flex lg:hidden gap-1.5 p-1.5 rounded-[15px] border border-gray-700 w-full" style={{ background: 'var(--primary-800)' }}>
            <button
              type="button"
              onClick={() => changeActiveTab("modelos")}
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-[11px] text-[13px] sm:text-[14.5px] font-medium border-0 cursor-pointer transition-all duration-200 ${activeTab === "modelos" ? "" : "bg-transparent text-gray-400 hover:text-gray-100"}`}
              style={activeTab === "modelos" ? { background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))', color: 'var(--primary-900)', boxShadow: '0 6px 16px -6px rgba(30,182,232,0.7)' } : {}}
            >
              Modelos de briefing
            </button>
            <button
              type="button"
              onClick={() => changeActiveTab("envios")}
              className={`flex-1 whitespace-nowrap px-3 py-2 rounded-[11px] text-[13px] sm:text-[14.5px] font-medium border-0 cursor-pointer transition-all duration-200 ${activeTab === "envios" ? "" : "bg-transparent text-gray-400 hover:text-gray-100"}`}
              style={activeTab === "envios" ? { background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))', color: 'var(--primary-900)', boxShadow: '0 6px 16px -6px rgba(30,182,232,0.7)' } : {}}
            >
              Briefings enviados
            </button>
          </div>

          <div className="flex items-center gap-3 lg:ml-auto lg:gap-3.5">
            <button
              id="tour-add-btn"
              type="button"
              onClick={() => router.push("/dashboard/briefings/novo")}
              className="flex-1 lg:flex-none flex items-center justify-center gap-[9px] h-[50px] px-6 rounded-[14px] text-[15px] sm:text-[16px] font-semibold border-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)', color: 'var(--primary-900)', boxShadow: '0 12px 28px -12px rgba(30,182,232,0.8)' }}
            >
              <Plus size={19} />
              Criar briefing
            </button>
            <div className="hidden lg:block flex-none">
              <HeaderProfile />
            </div>
          </div>
        </header>

        <section className="relative z-10 flex-1 min-h-0 flex flex-col gap-4">
          {activeTab === "modelos" && (
            <div
              className="flex-1 flex flex-col gap-[22px] rounded-3xl border border-gray-700 min-h-0 p-4 sm:p-6 lg:p-[26px_30px_30px]"
              style={{ background: 'var(--primary-900)' }}
            >
              <div className="flex items-center justify-between gap-4 flex-none">
                <span className="text-[16px] text-gray-400">
                  Mostrando <strong className="text-gray-100 font-semibold">{templates.length}</strong> modelos
                </span>
                {totalTemplates > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode((prev) => {
                        if (prev) setSelectedTemplateIds([]);
                        return !prev;
                      });
                    }}
                    className="grid place-items-center w-10 h-10 rounded-[11px] border border-gray-700 cursor-pointer transition-colors hover:border-primary-500"
                    style={{ background: 'var(--primary-800)' }}
                    title={selectionMode ? "Sair da seleção" : "Selecionar vários"}
                  >
                    <span className={`w-4 h-4 rounded-[5px] border-[1.5px] transition-colors ${selectionMode ? 'bg-primary-500 border-primary-500' : 'border-gray-500'}`} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto briefings-scroll min-h-0">
                {loading ? (
                  <SkeletonList rows={5} cols={3} />
                ) : erro ? (
                  <div className="py-16 text-center text-red-400 text-sm">{erro}</div>
                ) : templates.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-sm">
                    Nenhum modelo de briefing criado ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {templates.map((t, i) => {
                      const selected = selectedTemplateIds.includes(t.id);
                      const isMenuOpen = openMenuTemplateId === t.id;

                      const COVER_GRADIENTS = [
                        'linear-gradient(150deg, var(--primary-500), var(--primary-600))',
                        'linear-gradient(150deg, var(--primary-400), var(--primary-700))',
                        'linear-gradient(150deg, var(--primary-300), #156479)',
                      ];
                      const isDefaultColor = !t.card_bg_color || t.card_bg_color.toLowerCase() === '#0f172a';
                      const coverBg = isDefaultColor
                        ? COVER_GRADIENTS[i % 3]
                        : `linear-gradient(150deg, ${t.card_bg_color}, var(--primary-700))`;

                      return (
                        <div
                          key={t.id}
                          className="group rounded-[20px] border border-gray-700 overflow-visible relative transition-colors duration-200 hover:border-primary-600"
                          style={{ background: 'var(--primary-800)' }}
                        >
                          <div
                            className="absolute inset-0 z-[1] cursor-pointer rounded-[20px]"
                            onClick={() => abrirModalVisualizar(t.id)}
                          />

                          <div
                            className="relative h-[188px] rounded-[19px_19px_0_0] grid place-items-center overflow-hidden"
                            style={{ background: coverBg }}
                          >
                            <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                              {(() => {
                                const IconComp = t.cover_icon ? ICON_LIST[t.cover_icon] : null;
                                return IconComp
                                  ? <IconComp size={40} style={{ color: t.cover_icon_color || 'rgba(255,255,255,0.55)' }} />
                                  : <ClipboardList size={40} />;
                              })()}
                            </span>

                            {selectionMode && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleTemplateSelecionado(t.id); }}
                                className={`absolute top-3 left-3 z-[10] w-6 h-6 rounded-md border flex items-center justify-center text-[11px] transition-colors ${
                                  selected ? "border-primary-300 bg-primary-500" : "border-primary-700 bg-primary-900/60 text-gray-400 hover:bg-primary-800/60"
                                }`}
                                style={selected ? { color: 'var(--primary-900)' } : {}}
                              >
                                {selected ? "✓" : ""}
                              </button>
                            )}
                          </div>

                          <div
                            className="absolute top-4 right-4 z-[10]"
                            data-template-menu-trigger
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenMenuTemplateId(isMenuOpen ? null : t.id); }}
                              className="grid place-items-center w-[38px] h-[38px] rounded-full border-0 text-white cursor-pointer transition-colors"
                              style={{ background: 'var(--primary-700)', backdropFilter: 'blur(4px)' }}
                            >
                              <MoreVertical size={18} />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute top-[calc(100%+8px)] right-0 z-[10] w-[220px] p-2 rounded-2xl border border-gray-600 animate-fade-in"
                                style={{ background: 'var(--primary-800)', boxShadow: '0 30px 70px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(30,182,232,0.06)' }}
                                data-template-menu
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuTemplateId(null); abrirModalVisualizar(t.id); }}
                                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                                >
                                  <Eye size={18} className="text-gray-400" />
                                  Visualizar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuTemplateId(null); router.push(`/dashboard/briefings/novo?edit=${t.id}`); }}
                                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                                >
                                  <Pencil size={17} className="text-gray-400" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuTemplateId(null); abrirModalEnvio(t.id); }}
                                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                                >
                                  <Send size={17} className="text-gray-400" />
                                  Enviar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuTemplateId(null); duplicarTemplate(t.id); }}
                                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                                >
                                  <Copy size={17} className="text-gray-400" />
                                  Duplicar
                                </button>
                                <div className="h-px my-1.5 mx-2 bg-gray-700" />
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuTemplateId(null); abrirModalExcluirModelos([t.id]); }}
                                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-error-medium border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(239,83,80,0.10)]"
                                >
                                  <Trash2 size={17} />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="px-[22px] pt-[22px] pb-0">
                            <h3 className="m-0 text-[20px] font-bold text-gray-100 leading-tight tracking-tight line-clamp-2">
                              {t.titulo}
                            </h3>
                            {t.descricao ? (
                              <p className="mt-2 text-[14.5px] text-gray-400 line-clamp-2 min-h-[38px]">
                                {t.descricao}
                              </p>
                            ) : (
                              <p className="mt-2 text-[14.5px] text-gray-500 italic min-h-[38px]">
                                Sem descrição definida.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between px-[22px] py-[20px] mt-[18px] border-t border-gray-700">
                            <span className="flex items-center gap-2 text-[14px] text-gray-400">
                              <FileText size={16} className="text-gray-500" />
                              {t.campos_count ?? 0} campos
                            </span>
                            <span className="flex items-center gap-2 text-[14px] text-gray-400">
                              <Calendar size={16} className="text-gray-500" />
                              {t.updated_at ? formatarDataCurta(t.updated_at) : formatarDataCurta(t.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "envios" && (
            <div
              className="flex-1 flex flex-col gap-[22px] rounded-3xl border border-gray-700 min-h-0 p-4 sm:p-6 lg:p-[26px_30px_30px]"
              style={{ background: 'var(--primary-900)' }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 flex-none pb-5 border-b border-gray-700">
                <div className="flex items-center gap-3 sm:gap-4">
                  <h2 className="m-0 text-[18px] sm:text-[20px] font-bold text-gray-100">Briefings enviados</h2>
                  <div className="flex gap-1 p-1 rounded-[12px] border border-gray-700" style={{ background: 'var(--primary-800)' }}>
                    <button
                      type="button"
                      onClick={() => changeViewMode("list")}
                      title="Lista"
                      className={`grid place-items-center w-10 h-[34px] rounded-[9px] border-0 cursor-pointer transition-colors duration-200 ${viewMode === "list" ? "" : "bg-transparent text-gray-400 hover:text-primary-300"}`}
                      style={viewMode === "list" ? { background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))', color: 'var(--primary-900)' } : {}}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="0.5" fill="currentColor"/><circle cx="3.5" cy="12" r="0.5" fill="currentColor"/><circle cx="3.5" cy="18" r="0.5" fill="currentColor"/>
                      </svg>
                    </button>
                    {!isMobile && (
                      <button
                        type="button"
                        onClick={() => changeViewMode("board")}
                        title="Quadros"
                        className={`grid place-items-center w-10 h-[34px] rounded-[9px] border-0 cursor-pointer transition-colors duration-200 ${viewMode === "board" ? "" : "bg-transparent text-gray-400 hover:text-primary-300"}`}
                        style={viewMode === "board" ? { background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))', color: 'var(--primary-900)' } : {}}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="15" width="7" height="5" rx="1.5"/><rect x="14" y="15" width="7" height="5" rx="1.5"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-3.5">
                  <span className="text-[14px] sm:text-[15px] text-gray-400">
                    {totalEnvios === 0 ? "Nenhum envio" : totalEnvios === 1 ? "1 envio" : `${totalEnvios} envios`}
                  </span>
                  <div className="relative flex-1 sm:flex-none min-w-[140px]">
                    <select
                      value={filtroEnvioStatus}
                      onChange={(e) => setFiltroEnvioStatus(e.target.value as FiltroEnvioStatus)}
                      className="w-full h-[46px] pl-4 pr-9 rounded-[12px] border border-gray-700 text-[14.5px] text-gray-200 appearance-none cursor-pointer transition-colors hover:border-gray-500"
                      style={{ background: 'var(--primary-800)' }}
                    >
                      <option value="">Todos</option>
                      <option value="pendente">Pendentes</option>
                      <option value="respondido">Respondidos</option>
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  <div className="relative flex-1 sm:flex-none min-w-[140px]">
                    <select
                      value={filtroEmail}
                      onChange={(e) => setFiltroEmail(e.target.value as FiltroEmail)}
                      className="w-full h-[46px] pl-4 pr-9 rounded-[12px] border border-gray-700 text-[14.5px] text-gray-200 appearance-none cursor-pointer transition-colors hover:border-gray-500"
                      style={{ background: 'var(--primary-800)' }}
                    >
                      <option value="">E-mail: Todos</option>
                      <option value="com_email">E-mail enviado</option>
                      <option value="sem_email">Sem e-mail</option>
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>

              {effectiveViewMode === "list" && (
                <div className="hidden md:grid gap-5 px-2 pb-4 flex-none" style={{ gridTemplateColumns: '1.5fr 1.3fr 1.4fr 1fr 1.5fr' }}>
                  <span className="text-[13px] font-medium text-gray-400">Cliente</span>
                  <span className="text-[13px] font-medium text-gray-400">Projeto</span>
                  <span className="text-[13px] font-medium text-gray-400">Briefing</span>
                  <span className="text-[13px] font-medium text-gray-400">Status</span>
                  <span className="text-[13px] font-medium text-gray-400 text-right">Enviado / Prazo / Ações</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto briefings-scroll min-h-0">
                {loading ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Carregando envios...</div>
                ) : erro ? (
                  <div className="py-16 text-center text-red-400 text-sm">{erro}</div>
                ) : enviosFiltrados.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-sm">Nenhum envio encontrado com os filtros atuais.</div>
                ) : effectiveViewMode === "board" ? (
                  renderBoardView()
                ) : (
                  <div className="flex flex-col">
                    {enviosFiltrados.map((envio) => {
                      const tipoEnvio = classificarEnvio(envio, respostasPorProjeto);
                      const projeto = projetoDoEnvio(envio);
                      const cliente = projeto?.clientes || null;
                      const foto = cliente?.foto_url || null;
                      const enviadoEm = formatarDataCurta(envio.created_at);
                      const prazoResStr = envio.prazo_resposta ? formatarDataCurta(envio.prazo_resposta) : null;
                      const isRespondido = tipoEnvio === "respondido";

                      const menuNode = (
                        <div className="relative" data-envio-menu-trigger>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuEnvioId((cur) => cur === envio.id ? null : envio.id); }}
                            className="grid place-items-center w-[38px] h-[38px] rounded-[10px] border-0 bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-white/10 hover:text-gray-100"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openMenuEnvioId === envio.id && (
                            <div
                              className="absolute right-0 top-[calc(100%+6px)] z-50 w-[220px] p-2 rounded-2xl border border-gray-600 animate-fade-in"
                              style={{ background: 'var(--primary-800)', boxShadow: '0 30px 70px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(30,182,232,0.06)' }}
                              data-envio-menu
                            >
                              {isRespondido && envio.projeto_id && envio.template_id && (
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuEnvioId(null); router.push(`/dashboard/briefings/${envio.id}/respostas`); }}
                                  className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                                >
                                  <Eye size={18} className="text-gray-400" />
                                  Ver respostas
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => { setOpenMenuEnvioId(null); enviarEmailBriefing(envio); }}
                                className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                              >
                                <Send size={17} className="text-gray-400" />
                                {envio.email_enviado ? "Reenviar e-mail" : "Enviar por e-mail"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setOpenMenuEnvioId(null); copiarLinkBriefing(envio); }}
                                className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-gray-100 border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)] hover:text-gray-100"
                              >
                                <Copy size={17} className="text-gray-400" />
                                Copiar link
                              </button>
                              <div className="h-px my-1.5 mx-2 bg-gray-700" />
                              <button
                                type="button"
                                onClick={() => { setOpenMenuEnvioId(null); excluirEnvio(envio.id); }}
                                className="flex items-center gap-3 w-full px-3.5 py-3 rounded-[10px] text-[15.5px] font-medium text-error-medium border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(239,83,80,0.10)]"
                              >
                                <Trash2 size={17} />
                                Excluir envio
                              </button>
                            </div>
                          )}
                        </div>
                      );

                      const acaoPrincipalNode = isRespondido ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/briefings/${envio.id}/respostas`)}
                          className="flex-none text-[14px] font-semibold border-0 cursor-pointer px-[18px] py-[10px] rounded-[11px] transition-all duration-200 hover:-translate-y-px"
                          style={{ background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)', color: 'var(--primary-900)', boxShadow: '0 10px 22px -12px rgba(30,182,232,0.8)' }}
                        >
                          Ver respostas
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reenviarEnvio(envio)}
                          className="flex-none text-[14px] font-semibold cursor-pointer px-[18px] py-[10px] rounded-[11px] transition-colors duration-200"
                          style={{ color: 'var(--primary-300)', border: '1px solid rgba(30,182,232,0.4)', background: 'rgba(30,182,232,0.06)' }}
                        >
                          Reenviar
                        </button>
                      );

                      return (
                        <div key={envio.id} className="contents">
                          <div
                            className="hidden md:grid gap-5 px-2 py-[18px] items-center transition-colors duration-200 hover:bg-gray-700/30 border-t border-gray-700"
                            style={{ gridTemplateColumns: '1.5fr 1.3fr 1.4fr 1fr 1.5fr' }}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className="flex-none grid place-items-center w-11 h-11 rounded-full overflow-hidden border"
                                style={{ color: 'var(--primary-300)', background: 'rgba(30,182,232,0.08)', borderColor: 'rgba(30,182,232,0.22)' }}
                              >
                                {foto ? (
                                  <Image src={foto} alt="Cliente" width={44} height={44} className="object-cover w-full h-full" />
                                ) : (
                                  <User size={20} />
                                )}
                              </div>
                              <span className="text-[15.5px] font-semibold text-gray-100 truncate">
                                {cliente?.nome || "Cliente não informado"}
                              </span>
                            </div>

                            <span className="text-[15px] text-gray-500 truncate">
                              {projeto?.titulo || "Projeto não definido"}
                            </span>

                            <span className="text-[15.5px] font-medium text-gray-100 truncate">
                              {envio.template?.titulo || "Briefing"}
                            </span>

                            <div className="flex flex-col gap-2 items-start">
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold"
                                style={isRespondido
                                  ? { background: 'rgba(102,187,106,0.15)', color: 'var(--success-medium)', border: '1px solid rgba(102,187,106,0.3)' }
                                  : { background: 'rgba(255,167,38,0.15)', color: 'var(--alert-medium)', border: '1px solid rgba(255,167,38,0.3)' }
                                }
                              >
                                {isRespondido ? "Respondido" : "Pendente"}
                              </span>
                              {envio.email_enviado && (
                                <span className="inline-flex items-center gap-1.5 text-[13px] text-primary-400">
                                  <Send size={13} />
                                  E-mail enviado
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-end gap-3.5">
                              <div className="flex flex-col gap-[3px] text-right text-[13px] text-gray-400">
                                <span>Enviado: <strong className="text-gray-200 font-semibold">{enviadoEm}</strong></span>
                                {prazoResStr && <span>Prazo: <strong className="text-gray-200 font-semibold">{prazoResStr}</strong></span>}
                              </div>

                              {acaoPrincipalNode}
                              {menuNode}
                            </div>
                          </div>

                          <div
                            className="md:hidden flex flex-col gap-3 rounded-2xl border border-gray-700 p-4 mb-3"
                            style={{ background: 'var(--primary-800)' }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="flex-none grid place-items-center w-10 h-10 rounded-full overflow-hidden border"
                                  style={{ color: 'var(--primary-300)', background: 'rgba(30,182,232,0.08)', borderColor: 'rgba(30,182,232,0.22)' }}
                                >
                                  {foto ? (
                                    <Image src={foto} alt="Cliente" width={40} height={40} className="object-cover w-full h-full" />
                                  ) : (
                                    <User size={18} />
                                  )}
                                </div>
                                <div className="min-w-0 flex flex-col">
                                  <span className="text-[15px] font-semibold text-gray-100 truncate">
                                    {cliente?.nome || "Cliente não informado"}
                                  </span>
                                  <span className="text-[13px] text-gray-500 truncate">
                                    {projeto?.titulo || "Projeto não definido"}
                                  </span>
                                </div>
                              </div>
                              {menuNode}
                            </div>

                            <span className="text-[14.5px] font-medium text-gray-100 truncate">
                              {envio.template?.titulo || "Briefing"}
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold"
                                style={isRespondido
                                  ? { background: 'rgba(102,187,106,0.15)', color: 'var(--success-medium)', border: '1px solid rgba(102,187,106,0.3)' }
                                  : { background: 'rgba(255,167,38,0.15)', color: 'var(--alert-medium)', border: '1px solid rgba(255,167,38,0.3)' }
                                }
                              >
                                {isRespondido ? "Respondido" : "Pendente"}
                              </span>
                              {envio.email_enviado && (
                                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-primary-400">
                                  <Send size={12} />
                                  E-mail enviado
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[13px] text-gray-400">
                              <span>Enviado: <strong className="text-gray-200 font-semibold">{enviadoEm}</strong></span>
                              {prazoResStr && <span>Prazo: <strong className="text-gray-200 font-semibold">{prazoResStr}</strong></span>}
                            </div>

                            <div className="pt-1">{acaoPrincipalNode}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {selectionMode && algumModeloSelecionado && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-6 py-3 rounded-2xl bg-primary-800 border border-primary-600 shadow-2xl animate-fade-in-up">
            <span className="text-[14px] text-gray-200 font-medium">
              {selectedTemplateIds.length} selecionado{selectedTemplateIds.length > 1 ? "s" : ""}
            </span>
            
            <div className="h-6 w-px bg-primary-600" />

            <button
              onClick={() => abrirModalExcluirModelos(selectedTemplateIds)}
              className="flex items-center gap-2 text-rose-300 hover:text-rose-200 font-medium text-[14px] px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={16} />
              Excluir
            </button>
            
            <button
              onClick={() => {
                 setSelectionMode(false);
                 setSelectedTemplateIds([]);
              }}
               className="ml-2 text-gray-400 hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {sendModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xl bg-primary-900 border border-primary-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

              <div className="px-6 pt-5 pb-4 border-b border-primary-800 flex-shrink-0 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[16px] font-semibold text-gray-100">
                    {modalStep === "success" ? "Briefing criado!" : "Enviar briefing"}
                  </span>
                  {modalStep === "form" && (
                    <p className="text-[13px] text-gray-400 mt-0.5">
                      Escolha o modelo de briefing e como deseja enviar ao cliente.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fecharModalEnvio}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-800 text-gray-400 flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto briefings-scroll px-6 py-5 flex flex-col gap-5 min-h-0">

                {modalStep === "form" && (
                  <>
                    {sendError && (
                      <div className="px-4 py-3 rounded-xl bg-rose-900/20 border border-rose-500/50 text-rose-200 text-[13px] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                        {sendError}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-300">Modelo de briefing</label>
                      <div className="relative">
                        <select
                          value={sendSelectedTemplateId || ""}
                          onChange={(e) => setSendSelectedTemplateId(e.target.value || null)}
                          className="w-full bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500 transition-all appearance-none"
                        >
                          <option value="">Selecione um modelo</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.titulo}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">▼</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] text-gray-300">Como deseja enviar?</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setSendMode("projeto"); setSendSelectedProjetos([]); }}
                          className={`flex flex-col gap-1 px-4 py-3 rounded-xl border text-left transition-all ${
                            sendMode === "projeto"
                              ? "bg-primary-700 border-primary-500 text-gray-100"
                              : "bg-primary-800/50 border-primary-700 text-gray-400 hover:border-primary-600 hover:text-gray-200"
                          }`}
                        >
                          <span className="text-[13px] font-medium">Vincular a projeto</span>
                          <span className="text-[11px] opacity-70">
                            Selecione um ou mais projetos. O e-mail é enviado ao cliente cadastrado.
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSendMode("email"); setSendEmailProjetoId(null); }}
                          className={`flex flex-col gap-1 px-4 py-3 rounded-xl border text-left transition-all ${
                            sendMode === "email"
                              ? "bg-primary-700 border-primary-500 text-gray-100"
                              : "bg-primary-800/50 border-primary-700 text-gray-400 hover:border-primary-600 hover:text-gray-200"
                          }`}
                        >
                          <span className="text-[13px] font-medium">Enviar por e-mail</span>
                          <span className="text-[11px] opacity-70">
                            Informe um e-mail. O link do briefing é enviado e você pode copiar.
                          </span>
                        </button>
                      </div>
                    </div>

                    {sendMode === "projeto" && (
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-gray-300">
                          Projetos
                          <span className="ml-1.5 text-[11px] text-gray-500">(apenas projetos com cliente cadastrado são selecionáveis)</span>
                        </label>

                        {sendSelectedProjetos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {sendSelectedProjetos.map((pid) => {
                              const p = projetos.find((proj) => proj.id === pid);
                              return (
                                <div key={pid} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-700 border border-primary-500 text-[12px] text-gray-100">
                                  <span className="truncate max-w-[140px]">
                                    {p?.titulo || "Projeto"}
                                    {p?.clientes?.nome ? ` — ${p.clientes.nome}` : ""}
                                  </span>
                                  <button type="button" onClick={() => toggleProjetoSelecionado(pid)} className="text-gray-400 hover:text-rose-300 leading-none">✕</button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="bg-primary-900/60 border border-primary-700 rounded-xl overflow-hidden">
                          <div className="px-3 py-2 border-b border-primary-800">
                            <input
                              type="text"
                              value={sendSearchProjeto}
                              onChange={(e) => setSendSearchProjeto(e.target.value)}
                              placeholder="Buscar projeto ou cliente..."
                              className="bg-transparent outline-none text-[13px] text-gray-100 placeholder-gray-600 w-full"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto briefings-scroll divide-y divide-primary-800">
                            {projetosFiltradosModal.length === 0 ? (
                              <div className="text-[12px] text-gray-500 py-6 text-center">Nenhum projeto encontrado.</div>
                            ) : (
                              projetosFiltradosModal.map((p) => {
                                const temEmail = !!p.clientes?.email;
                                const selected = sendSelectedProjetos.includes(p.id);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={!temEmail}
                                    onClick={() => temEmail && toggleProjetoSelecionado(p.id)}
                                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-[13px] transition-colors ${
                                      !temEmail
                                        ? "opacity-35 cursor-not-allowed"
                                        : selected
                                        ? "bg-primary-700/60 text-gray-100"
                                        : "text-gray-300 hover:bg-primary-800/60"
                                    }`}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-medium truncate">{p.titulo}</span>
                                      <span className="text-[11px] text-gray-500 truncate">
                                        {p.clientes?.nome || p.clientes?.empresa || "Sem cliente"}
                                        {!temEmail && " · sem e-mail cadastrado"}
                                      </span>
                                    </div>
                                    {temEmail && (
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                                        selected ? "bg-primary-500 border-primary-600" : "border-primary-700"
                                      }`}>
                                        {selected && (
                                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {sendMode === "email" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-300">E-mail do cliente</label>
                          <input
                            type="email"
                            value={emailManual}
                            onChange={(e) => setEmailManual(e.target.value)}
                            placeholder="email@cliente.com"
                            className="w-full bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
                            autoFocus
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[13px] text-gray-300">
                            Vincular a projeto <span className="text-gray-500">(opcional)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={sendEmailProjetoId || ""}
                              onChange={(e) => setSendEmailProjetoId(e.target.value || null)}
                              className="w-full bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500 transition-all appearance-none"
                            >
                              <option value="">Nenhum projeto</option>
                              {projetos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.titulo}{p.clientes?.nome ? ` — ${p.clientes.nome}` : ""}
                                </option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">▼</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] text-gray-300">Prazo para resposta <span className="text-gray-500">(opcional)</span></label>
                      <DatePicker value={sendPrazo} onChange={(v) => setSendPrazo(v)} placeholder="dd/mm/aaaa" />
                    </div>
                  </>
                )}

                {modalStep === "success" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 8L6.5 12.5L14 3.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-[13px] text-emerald-300">
                        {linksGerados.length === 1 ? "Briefing criado com sucesso!" : `${linksGerados.length} briefings criados!`}
                      </span>
                    </div>

                    {linksGerados.map((item, i) => (
                      <div key={i} className="flex flex-col gap-2.5 p-4 bg-primary-800/50 border border-primary-700 rounded-xl">
                        {item.projetoTitulo !== "Briefing" && (
                          <div className="text-[13px] font-medium text-gray-200">{item.projetoTitulo}</div>
                        )}

                        {item.link && (
                          <>
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] text-gray-500 uppercase tracking-wide">Link do briefing</span>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-primary-900 border border-primary-700 rounded-lg px-3 py-2 text-[12px] text-gray-400 truncate font-mono">
                                  {item.link}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(item.link!).then(() => showToast("Link copiado!"))}
                                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-[12px] text-gray-100 flex items-center gap-1.5 transition-colors"
                                >
                                  <Copy size={12} />
                                  Copiar
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {item.emailStatus && (
                          <div className={`text-[12px] flex items-center gap-1.5 ${item.emailEnviado ? "text-emerald-400" : "text-rose-400"}`}>
                            <Send size={11} className="flex-shrink-0" />
                            {item.emailStatus}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-primary-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                {modalStep === "form" ? (
                  <>
                    <div className="text-[12px] text-gray-500">
                      {sendMode === "projeto"
                        ? sendSelectedProjetos.length === 0
                          ? "Nenhum projeto selecionado."
                          : `${sendSelectedProjetos.length} projeto${sendSelectedProjetos.length > 1 ? "s" : ""} selecionado${sendSelectedProjetos.length > 1 ? "s" : ""}.`
                        : emailManual.trim()
                        ? `Destino: ${emailManual.trim()}`
                        : "Informe o e-mail do cliente."}
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={fecharModalEnvio} disabled={sending} className="px-4 py-2 rounded-lg text-[13px] text-gray-300 hover:bg-primary-800 disabled:opacity-60">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleEnviarBriefingModal}
                        disabled={sending}
                        className={`px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                          sending
                            ? "bg-primary-700 text-primary-200 cursor-not-allowed"
                            : "bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20"
                        }`}
                      >
                        {sending
                          ? "Enviando..."
                          : sendMode === "email"
                          ? "Enviar e-mail"
                          : "Enviar para projetos"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-end w-full">
                    <button type="button" onClick={fecharModalEnvio} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-primary-700 hover:bg-primary-600 text-gray-100 transition-colors">
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewModalOpen && (
          <div
            className="fixed inset-0 z-40 grid place-items-center p-4 sm:p-6 lg:p-10"
            style={{ background: 'rgba(4,12,16,0.72)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-full flex flex-col overflow-hidden"
              style={{
                maxWidth: 920,
                maxHeight: 'calc(100vh - 32px)',
                borderRadius: 26,
                border: '1px solid var(--gray-600)',
                background: 'linear-gradient(180deg, rgba(16,40,50,0.98), rgba(7,28,36,0.98))',
                boxShadow: '0 50px 110px -34px rgba(0,0,0,0.85), 0 0 0 1px rgba(30,182,232,0.10), 0 0 100px -40px rgba(30,182,232,0.4)',
              }}
            >
              <header
                className="flex items-start gap-3 sm:gap-[18px] flex-none px-4 sm:px-6 lg:px-[34px] pt-5 sm:pt-7 lg:pt-[30px] pb-4 sm:pb-5 lg:pb-[26px]"
                style={{ borderBottom: '1px solid var(--gray-700)' }}
              >
                <span
                  className="flex-none grid place-items-center w-[42px] h-[42px] sm:w-[54px] sm:h-[54px]"
                  style={{
                    borderRadius: 16,
                    color: 'var(--primary-300)',
                    background: 'rgba(30,182,232,0.12)',
                    border: '1px solid rgba(30,182,232,0.30)',
                  }}
                >
                  <FileText size={24} strokeWidth={1.7} />
                </span>

                <div className="flex-1 min-w-0">
                  <h2
                    className="m-0 font-bold text-white text-[19px] sm:text-[23px] lg:text-[27px] truncate"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {viewTemplate?.titulo || "Modelo de briefing"}
                  </h2>
                  {viewTemplate?.descricao && (
                    <p className="m-0 mt-[6px] line-clamp-2" style={{ fontSize: 15, color: 'var(--gray-400)' }}>
                      {viewTemplate.descricao}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      fecharModalVisualizar();
                      if (viewTemplate?.id) router.push(`/dashboard/briefings/novo?edit=${viewTemplate.id}`);
                    }}
                    className="grid place-items-center cursor-pointer transition-all duration-200"
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      border: '1px solid var(--gray-700)',
                      background: 'rgba(20,40,48,0.4)',
                      color: 'var(--gray-300)',
                    }}
                    title="Editar este modelo"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-500)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-300)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-700)'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-300)'; }}
                  >
                    <Pencil size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={fecharModalVisualizar}
                    className="grid place-items-center cursor-pointer transition-all duration-200"
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      border: '1px solid var(--gray-700)',
                      background: 'rgba(20,40,48,0.4)',
                      color: 'var(--gray-300)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-500)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-700)'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-300)'; }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </header>

              {viewError && (
                <div
                  className="mx-4 sm:mx-6 lg:mx-[34px] mt-5 flex-none flex items-center gap-2 rounded-[13px] text-[13px]"
                  style={{ padding: '14px 18px', background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.3)', color: 'var(--error-light)' }}
                >
                  <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: 'var(--error-medium)' }} />
                  {viewError}
                </div>
              )}

              <div
                className="flex-1 overflow-y-auto briefings-view-scroll flex flex-col min-h-0 px-4 sm:px-6 lg:px-[34px] pt-5 sm:pt-6 lg:pt-[26px] pb-5 sm:pb-7 lg:pb-8"
                style={{ gap: 20 }}
              >
                {viewLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span style={{ color: 'var(--gray-400)', fontSize: 14 }}>Carregando formulário...</span>
                  </div>
                ) : viewCampos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--gray-500)' }}>
                    <ClipboardList size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    <span style={{ fontSize: 14 }}>Nenhuma pergunta configurada neste modelo.</span>
                  </div>
                ) : (
                  viewCampos.map((campo) => (
                    <div
                      key={campo.id}
                      className="p-5 sm:p-[26px_28px]"
                      style={{
                        borderRadius: 18,
                        border: '1px solid var(--gray-700)',
                        background: 'rgba(8,34,42,0.4)',
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4" style={{ marginBottom: 18 }}>
                        <span className="font-bold text-white text-[17px] sm:text-[20px]" style={{ letterSpacing: '-0.01em' }}>
                          {campo.titulo_pergunta}
                          {campo.obrigatorio && (
                            <span style={{ color: 'var(--error-medium)', marginLeft: 4 }}>*</span>
                          )}
                        </span>
                        <span
                          className="flex-none font-bold uppercase"
                          style={{
                            fontSize: 12.5, letterSpacing: '0.1em',
                            color: 'var(--primary-300)',
                            padding: '8px 14px', borderRadius: 10,
                            background: 'rgba(30,182,232,0.10)',
                            border: '1px solid rgba(30,182,232,0.30)',
                          }}
                        >
                          {labelTipoCampo(campo.tipo)}
                        </span>
                      </div>

                      {campo.descricao_pergunta && (
                        <p className="m-0 mb-4" style={{ fontSize: 14, color: 'var(--gray-400)' }}>
                          {campo.descricao_pergunta}
                        </p>
                      )}

                      {campo.tipo === "short_text" && (
                        <div style={{
                          padding: '18px 20px', borderRadius: 13,
                          border: '1px solid var(--gray-600)',
                          background: 'rgba(6,25,31,0.5)',
                          fontSize: 16, fontStyle: 'italic',
                          color: 'var(--gray-500)',
                        }}>
                          Resposta curta…
                        </div>
                      )}

                      {campo.tipo === "long_text" && (
                        <div style={{
                          padding: '18px 20px', borderRadius: 13,
                          border: '1px solid var(--gray-600)',
                          background: 'rgba(6,25,31,0.5)',
                          fontSize: 16, fontStyle: 'italic',
                          color: 'var(--gray-500)',
                          minHeight: 120,
                        }}>
                          Resposta longa…
                        </div>
                      )}

                      {(campo.tipo === "multiple_choice" || campo.tipo === "checkboxes") && (
                        <div className="flex flex-col" style={{ gap: 16 }}>
                          {campo.opcoes && campo.opcoes.length > 0 ? (
                            campo.opcoes.map((op, i) => (
                              <label key={i} className="flex items-center" style={{ gap: 14, cursor: 'pointer' }}>
                                <span
                                  className="flex-none"
                                  style={{
                                    width: 26, height: 26,
                                    border: '2px solid var(--gray-500)',
                                    borderRadius: campo.tipo === "multiple_choice" ? '50%' : 8,
                                    display: 'block',
                                  }}
                                />
                                <span style={{ fontSize: 17, color: 'var(--gray-200)' }}>{op}</span>
                              </label>
                            ))
                          ) : (
                            <span className="italic" style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                              Sem opções definidas.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {deleteModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md bg-primary-900 border border-primary-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[16px] font-semibold text-gray-100">
                    Excluir modelo
                    {templatesToDelete.length > 1 ? "s" : ""} de briefing
                  </span>
                  <span className="text-[13px] text-gray-400">
                    Esta ação não pode ser desfeita. Os modelos e suas
                    perguntas serão removidos da sua conta.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={fecharModalExcluirModelos}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-800 text-gray-400"
                >
                  ✕
                </button>
              </div>

              <div className="text-[13px] text-gray-300">
                {templatesToDelete.length === 1 ? (
                  <span>
                    Tem certeza de que deseja excluir este modelo de briefing?
                  </span>
                ) : (
                  <span>
                    Tem certeza de que deseja excluir{" "}
                    <strong>{templatesToDelete.length}</strong> modelos de
                    briefing?
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={fecharModalExcluirModelos}
                  disabled={deletingTemplates}
                  className="px-4 py-2 rounded-lg text-[13px] text-gray-300 hover:bg-primary-800 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExcluirModelos}
                  disabled={deletingTemplates}
                  className={`px-5 py-2 rounded-lg text-[14px] font-semibold ${
                    deletingTemplates
                      ? "bg-rose-700 text-rose-50 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  {deletingTemplates ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmExcluirEnvioId && (
          <ConfirmModal
            title="Excluir envio de briefing"
            message="Tem certeza que deseja excluir este envio? Esta ação não pode ser desfeita."
            confirmLabel="Excluir"
            cancelLabel="Cancelar"
            onConfirm={() => excluirEnvioConfirmado(confirmExcluirEnvioId)}
            onCancel={() => setConfirmExcluirEnvioId(null)}
            danger
          />
        )}

        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl bg-primary-800 border border-primary-600 text-gray-100 text-[14px] shadow-2xl animate-fade-in whitespace-nowrap">
            {toastMsg}
          </div>
        )}

        <style jsx global>{`
          .briefings-scroll::-webkit-scrollbar {
            width: 10px;
          }
          .briefings-scroll::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.9);
          }
          .briefings-scroll::-webkit-scrollbar-thumb {
            background: var(--primary-500);
            border-radius: 999px;
            border: 2px solid rgba(15, 23, 42, 0.9);
          }
          .briefings-view-scroll::-webkit-scrollbar {
            width: 10px;
          }
          .briefings-view-scroll::-webkit-scrollbar-thumb {
            background: var(--primary-600);
            border-radius: 8px;
            border: 3px solid transparent;
            background-clip: padding-box;
          }
          .briefings-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--primary-400);
          }
          .briefings-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-500) rgba(15, 23, 42, 0.9);
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
      </div>
    </>
  );
}