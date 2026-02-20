"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreVertical,
  ClipboardList,
  FileText,
  Calendar,
  Copy,
  Send,
  Eye,
  Plus,
  Search,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { encode } from "punycode";

type Cliente = {
  id: string;
  nome: string | null;
  empresa: string | null;
  foto_url?: string | null;
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
};

type BriefingEnvio = {
  id: string;
  user_id: string;
  template_id: string;
  projeto_id: string | null;
  status: string | null;
  prazo_resposta: string | null;
  created_at: string;
  responded_at: string | null;
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
type ActiveTab = "modelos" | "envios";
type ViewMode = "list" | "board";

function formatarDataCurta(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
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

function classificarEnvio(
  envio: BriefingEnvio,
  respostasPorProjeto: Record<string, number>
): "pendente" | "respondido" {
  const raw = String(envio.status || "").toLowerCase();
  if (raw === "respondido" || raw === "concluido") return "respondido";
  if (envio.responded_at) return "respondido";
  if (envio.projeto_id && respostasPorProjeto[envio.projeto_id]) {
    return "respondido";
  }
  return "pendente";
}

export default function BriefingsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<any>(null);

  const [templates, setTemplates] = useState<BriefingTemplate[]>([]);
  const [envios, setEnvios] = useState<BriefingEnvio[]>([]);
  const [respostas, setRespostas] = useState<BriefingResposta[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroEnvioStatus, setFiltroEnvioStatus] =
    useState<FiltroEnvioStatus>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("modelos");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    const saved = localStorage.getItem("briefingsViewMode");
    if (saved === "list" || saved === "board") {
      setViewMode(saved);
    }
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("briefingsViewMode", mode);
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const [openMenuEnvioId, setOpenMenuEnvioId] = useState<string | null>(null);

  const [openMenuTemplateId, setOpenMenuTemplateId] = useState<string | null>(
    null
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendSelectedTemplateId, setSendSelectedTemplateId] =
    useState<string | null>(null);
  const [sendSelectedProjetos, setSendSelectedProjetos] = useState<string[]>(
    []
  );
  const [sendPrazo, setSendPrazo] = useState("");
  const [sendSearchProjeto, setSendSearchProjeto] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user;

      if (!u) {
        setUser(null);
        setTemplates([]);
        setEnvios([]);
        setRespostas([]);
        setProjetos([]);
        setErro("Usuário não autenticado.");
        setLoading(false);
        return;
      }

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
            responded_at,
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
              foto_url
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
          responded_at: e.responded_at ?? null,
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
            };
          }
        } else if (p.clientes) {
          cliente = {
            id: String(p.clientes.id),
            nome: p.clientes.nome ?? null,
            empresa: p.clientes.empresa ?? null,
            foto_url: p.clientes.foto_url ?? null,
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
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

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

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const displayName =
    user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";

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
      if (filtroEnvioStatus === "pendente") return tipo === "pendente";
      if (filtroEnvioStatus === "respondido") return tipo === "respondido";
      return true;
    });
  }, [envios, filtroEnvioStatus, respostasPorProjeto]);

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

  async function excluirEnvio(id: string) {
    if (!confirm("Excluir este envio de briefing?")) return;
    await supabase.from("briefings_envios").delete().eq("id", id);
    setEnvios((prev) => prev.filter((e) => e.id !== id));
  }

  async function reenviarEnvio(envio: BriefingEnvio) {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    if (!u) {
      alert("Usuário não autenticado.");
      return;
    }

    await supabase.from("atividades").insert([
      {
        user_id: u.id,
        projeto_id: envio.projeto_id,
        tipo: "Briefing",
        descricao: `Briefing (${envio.template?.titulo || "sem título"}) reenviado para o cliente.`,
      },
    ]);

    alert("Reenvio registrado. No futuro o cliente verá isso no painel.");
  }

  function abrirModalEnvio(templateId?: string) {
    setSendSelectedTemplateId(templateId || null);
    setSendSelectedProjetos([]);
    setSendPrazo("");
    setSendSearchProjeto("");
    setSendError(null);
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

  async function handleEnviarBriefingModal() {
    if (!user) {
      setSendError("Usuário não autenticado.");
      return;
    }

    const templateId = sendSelectedTemplateId;
    if (!templateId) {
      setSendError("Selecione um modelo de briefing.");
      return;
    }

    if (sendSelectedProjetos.length === 0) {
      setSendError("Selecione pelo menos um projeto para enviar.");
      return;
    }

    setSendError(null);
    setSending(true);

    try {
      const rows = sendSelectedProjetos.map((pid) => ({
        user_id: user.id,
        template_id: templateId,
        projeto_id: pid,
        status: "pendente",
        prazo_resposta: sendPrazo || null,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("briefings_envios")
        .insert(rows)
        .select(
          `
          id,
          user_id,
          template_id,
          projeto_id,
          status,
          prazo_resposta,
          created_at,
          responded_at,
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
        );

      if (insertError) {
        setSendError(insertError.message || "Erro ao enviar briefing.");
        setSending(false);
        return;
      }

      const normalizadosInseridos = (inserted || []).map((e: any) => {
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
          responded_at: e.responded_at ?? null,
          template: e.template
            ? {
                id: String(e.template.id),
                titulo: e.template.titulo as string,
              }
            : null,
          projeto,
        } as BriefingEnvio;
      });

      setEnvios((prev) => [...normalizadosInseridos, ...prev]);
      setSending(false);
      setSendModalOpen(false);
      alert("Briefing enviado com sucesso.");
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
      alert("Erro ao atualizar status. Tente novamente.");
      return;
    }

    setEnvios((prev) =>
      prev.map((e) => (e.id === envioId ? { ...e, status: novoStatus } : e))
    );
  }

  function renderBoardView() {
    const colunas = [
      { id: "pendente", title: "Enviado", color: "bg-blue-500" },
      { id: "respondido", title: "Respondido", color: "bg-emerald-500" },
    ];

    const enviosPorColuna = {
      pendente: enviosFiltrados.filter((e) => {
        const status = classificarEnvio(e, respostasPorProjeto);
        return status === "pendente";
      }),
      respondido: enviosFiltrados.filter((e) => {
        const status = classificarEnvio(e, respostasPorProjeto);
        return status === "respondido";
      }),
    };

    const handleDrop = (e: React.DragEvent, targetCol: string) => {
      e.preventDefault();
      const envioId = e.dataTransfer.getData("application/x-envio-id");
      if (!envioId) return;

      const envio = envios.find((ev) => ev.id === envioId);
      if (!envio) return;

      const currentStatus = classificarEnvio(envio, respostasPorProjeto);
      if (currentStatus === targetCol) return;

      // Se mover de Respondido para Enviado (não faz muito sentido, mas ok)
      // Se mover de Enviado para Respondido (ok, marca como concluído manual)
      if (targetCol === "respondido") {
        updateEnvioStatus(envioId, "respondido");
      } else {
        updateEnvioStatus(envioId, "pendente");
      }
    };

    const EnvioBoardCard = ({ envio }: { envio: BriefingEnvio }) => {
      const projeto = projetoDoEnvio(envio);
      const cliente = projeto?.clientes || null;
      const foto = cliente?.foto_url || "/cliente_placeholder.svg";
      const enviadoEm = formatarDataCurta(envio.created_at);
      const prazoResStr = envio.prazo_resposta
        ? formatarDataCurta(envio.prazo_resposta)
        : null;

       const status = statusEnvioVisual(envio);

      return (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-envio-id", envio.id);
          }}
          className="bg-primary-800 border border-primary-700/50 rounded-xl p-4 shadow-sm hover:border-primary-500 transition-colors cursor-move group relative"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Image
                src={foto}
                alt="Cliente"
                width={28}
                height={28}
                className="rounded-full object-cover border border-primary-600"
              />
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-gray-100 line-clamp-1">
                  {cliente?.nome || "Cliente"}
                </span>
                <span className="text-[11px] text-gray-400 line-clamp-1">
                  {cliente?.empresa}
                </span>
              </div>
            </div>
             <div className="relative">
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuEnvioId((cur) =>
                    cur === envio.id ? null : envio.id
                    );
                }}
                className="p-1 hover:bg-primary-700 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                <MoreVertical size={16} />
                </button>
                    {openMenuEnvioId === envio.id && (
                        <div className="absolute right-0 top-6 w-40 bg-gray-800 border border-gray-700 rounded shadow-xl z-20 flex flex-col py-1">
                             {envio.status === 'respondido' || envio.responded_at ? (
                                <button
                                onClick={() => {
                                  setOpenMenuEnvioId(null);
                                  router.push(
                                    `/dashboard/briefings/${envio.id}/respostas`
                                  )
                                }}
                                className="px-4 py-2 text-left text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                                >
                                <Eye size={13} /> Ver respostas
                                </button>
                             ) : (
                                <button
                                onClick={() => {
                                    setOpenMenuEnvioId(null);
                                    reenviarEnvio(envio);
                                }}
                                className="px-4 py-2 text-left text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                                >
                                <Send size={13} /> Reenviar
                                </button>
                             )}
                            <button
                            onClick={() => {
                                setOpenMenuEnvioId(null);
                                excluirEnvio(envio.id);
                            }}
                            className="px-4 py-2 text-left text-xs text-red-400 hover:bg-gray-700 flex items-center gap-2"
                            >
                            <Trash2 size={13} /> Excluir
                            </button>
                        </div>
                    )}
            </div>
          </div>

          <div className="mb-3">
             <div className="text-[13px] text-gray-200 font-medium mb-0.5">
                {envio.template?.titulo || "Briefing"}
             </div>
             <div className="text-[12px] text-primary-400">
                {projeto?.titulo}
             </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-primary-700/50">
             <div className="flex flex-col text-[11px] text-gray-400">
                <span>Enviado: {enviadoEm}</span>
                {prazoResStr && <span>Prazo: {prazoResStr}</span>}
             </div>
              <span className={`w-2 h-2 rounded-full ${status.bg.replace('bg-opacity-10', 'bg-opacity-100')}`} title={status.label} />
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-4 min-w-[600px] px-1 pb-2">
          {colunas.map((col) => (
            <div
              key={col.id}
              className="flex-1 flex flex-col min-w-[280px] bg-primary-800/20 rounded-xl border border-primary-800/50 h-full backdrop-blur-sm"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-3 flex items-center justify-between border-b border-primary-800/50">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${col.color}`} />
                   <span className="text-[13px] font-medium text-gray-200">{col.title}</span>
                   <span className="text-[11px] text-gray-500 bg-primary-800 px-1.5 py-0.5 rounded-full">
                     {enviosPorColuna[col.id as keyof typeof enviosPorColuna]?.length || 0}
                   </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 briefings-scroll">
                {enviosPorColuna[col.id as keyof typeof enviosPorColuna]?.map((envio) => (
                    <EnvioBoardCard key={envio.id} envio={envio} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function duplicarTemplate(templateId: string) {
    if (!user) return;
    
    // 1. Encontrar o template original na lista
    const original = templates.find(t => t.id === templateId);
    if (!original) return;

    const novoTitulo = `${original.titulo} (Cópia)`;

    try {
      // 2. Criar novo template
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

      // 3. Buscar campos do original
      const { data: camposOriginais, error: camposError } = await supabase
        .from("briefings_campos")
        .select("*")
        .eq("template_id", original.id);

      if (camposError) throw camposError;

      if (camposOriginais && camposOriginais.length > 0) {
        // 4. Inserir campos no novo template
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

      // 5. Atualizar estado local
      const novoTemplate: BriefingTemplate = {
        id: String(newTplData.id),
        user_id: String(newTplData.user_id),
        titulo: newTplData.titulo,
        descricao: newTplData.descricao,
        created_at: newTplData.created_at,
        updated_at: newTplData.updated_at,
        campos_count: original.campos_count, // assumindo sucesso na cópia dos campos
        card_bg_color: newTplData.card_bg_color,
        card_text_color: newTplData.card_text_color
      };

      setTemplates(prev => [novoTemplate, ...prev]);

    } catch (err: any) {
      alert("Erro ao duplicar modelo: " + err.message);
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
        alert(error.message || "Erro ao excluir modelos.");
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
      alert(err.message || "Erro inesperado ao excluir modelos.");
      setDeletingTemplates(false);
    }
  }

  const algumModeloSelecionado = selectedTemplateIds.length > 0;

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-8 overflow-hidden">
        <header className="w-full flex items-center justify-between gap-4 mb-2">
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
            </button>


          </div>



          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/briefings/novo")}
              className="bg-primary-500 hover:bg-primary-400 text-white font-semibold rounded-lg px-5 py-2.5 text-[14px] flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
            >
              <Plus size={18} />
              Criar briefing
            </button>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Image
                  src={avatarSrc}
                  alt="Perfil"
                  width={35}
                  height={35}
                  className="rounded-full object-cover border border-primary-600"
                />

                {profileOpen ? (
                  <ChevronUp size={18} className="text-primary-100" />
                ) : (
                  <ChevronDown size={18} className="text-primary-100" />
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-primary-800 border border-primary-600 rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-fade-in">
                  <button
                    className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/dashboard/perfil");
                    }}
                  >
                    <Pencil size={20} className="text-primary-200" />
                    Editar perfil
                  </button>

                  <button
                    className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/dashboard/tema");
                    }}
                  >
                    <SlidersHorizontal size={20} className="text-primary-200" />
                    Personalizar tema
                  </button>

                  <button className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300">
                    <Crown size={20} />
                    Assinatura
                  </button>

                  <button
                    className="flex items-center gap-3 text-red-400 hover:text-red-300 pt-2"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/login");
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sair da plataforma
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex p-1 bg-primary-900 border border-gray-700 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("modelos")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "modelos"
                ? "bg-primary-500 text-primary-900 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Modelos de briefing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("envios")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "envios"
                ? "bg-primary-500 text-primary-900 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Briefings enviados
          </button>
        </div>

        <section className="flex-1 min-h-0 flex flex-col gap-4">
          {activeTab === "modelos" && (
            <div className="flex-1 bg-primary-900 border border-primary-800 rounded-2xl flex flex-col">
              <div className="px-6 py-4 border-b border-primary-800 flex items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-[14px] text-gray-400">
                      Mostrando {templates.length} modelos
                    </span>
                 </div>

                 {totalTemplates > 0 && (
                   <button
                     onClick={() => {
                       setSelectionMode((prev) => {
                         if (prev) setSelectedTemplateIds([]);
                         return !prev;
                       });
                     }}
                     className={`ml-2 p-1.5 rounded-md border transition-colors ${
                       selectionMode
                         ? "bg-primary-700 border-primary-500 text-primary-100"
                         : "bg-primary-800 border-primary-700 text-gray-400 hover:border-gray-500"
                     }`}
                     title={selectionMode ? "Sair da seleção" : "Selecionar vários"}
                   >
                     {selectionMode ? (
                       <CheckSquare size={16} />
                     ) : (
                       <Square size={16} />
                     )}
                   </button>
                 )}
              </div>

              <div className="flex-1 max-h-full overflow-y-auto briefings-scroll px-6 py-4">
                {loading ? (
                  <div className="py-16 text-center text-gray-400 text-sm">
                    Carregando modelos...
                  </div>
                ) : erro ? (
                  <div className="py-16 text-center text-red-400 text-sm">
                    {erro}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-sm">
                    Nenhum modelo de briefing criado ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {templates.map((t) => {
                      const selected = selectedTemplateIds.includes(t.id);
                      const isMenuOpen = openMenuTemplateId === t.id;

                      return (
                        <div
                          key={t.id}
                          className="group bg-primary-800 border border-primary-700 rounded-xl hover:border-primary-500 transition-all flex flex-col relative"
                        >
                          <div
                            className="h-40 relative rounded-t-xl cursor-pointer overflow-hidden"
                            onClick={() => abrirModalVisualizar(t.id)}
                            style={{
                              backgroundColor: t.card_bg_color || "#0f172a",
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-40 transition-opacity">
                              <ClipboardList
                                size={48}
                                color={t.card_text_color || "#ffffff"}
                              />
                            </div>

                            {/* Seleção Checkbox (se ativo) */}
                            {selectionMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTemplateSelecionado(t.id);
                                }}
                                className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-md border flex items-center justify-center text-[11px] transition-colors ${
                                  selected
                                    ? "border-primary-300 bg-primary-500 text-primary-900"
                                    : "border-white/30 bg-black/40 text-white/70 hover:bg-black/60"
                                }`}
                              >
                                {selected ? "✓" : ""}
                              </button>
                            )}

                            {/* Menu de Ações MOVIDO para fora do header overflow-hidden */}
                          </div>

                          {/* Menu de Ações (Posicionado Absolutamente sobre o card) */}
                          <div
                            className="absolute top-3 right-3 z-30"
                            data-template-menu-trigger
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                setOpenMenuTemplateId(
                                  isMenuOpen ? null : t.id
                                )
                              }
                              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute right-0 mt-2 w-48 bg-primary-800 border border-primary-600 rounded-lg shadow-xl py-1 z-50 animate-fade-in overflow-hidden"
                                data-template-menu
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuTemplateId(null);
                                    abrirModalVisualizar(t.id);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                                >
                                  <Eye size={14} className="text-gray-400" />
                                  Visualizar
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenuTemplateId(null);
                                    router.push(
                                      `/dashboard/briefings/novo?edit=${t.id}`
                                    );
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                                >
                                  <Pencil size={14} className="text-gray-400" />
                                  Editar
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenuTemplateId(null);
                                    abrirModalEnvio(t.id);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                                >
                                  <Send size={14} className="text-gray-400" />
                                  Enviar
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenuTemplateId(null);
                                    duplicarTemplate(t.id);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                                >
                                  <Copy size={14} className="text-gray-400" />
                                  Duplicar
                                </button>

                                <div className="h-px bg-primary-700 my-1 mx-2" />

                                <button
                                  onClick={() => {
                                    setOpenMenuTemplateId(null);
                                    abrirModalExcluirModelos([t.id]);
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-rose-300 hover:bg-rose-500/10 flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </div>

                          <div
                            className="p-5 flex flex-col gap-3 flex-1 cursor-pointer rounded-b-xl"
                            onClick={() => abrirModalVisualizar(t.id)}
                          >
                            <div>
                              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary-400 transition-colors line-clamp-2 text-gray-100">
                                {t.titulo}
                              </h3>
                              {t.descricao ? (
                                <p className="text-slate-400 text-xs mt-2 line-clamp-2 min-h-[32px]">
                                  {t.descricao}
                                </p>
                              ) : (
                                <p className="text-slate-500 text-xs mt-2 italic min-h-[32px]">
                                  Sem descrição definida.
                                </p>
                              )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-primary-700/50 flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-1.5" title="Quantidade de campos">
                                <FileText className="w-3.5 h-3.5" />
                                <span>{t.campos_count ?? 0} campos</span>
                              </div>
                              <div className="flex items-center gap-1.5" title="Data de atualização">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {t.updated_at
                                    ? formatarDataCurta(t.updated_at)
                                    : formatarDataCurta(t.created_at)}
                                </span>
                              </div>
                            </div>
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
            <div className="flex-1 bg-primary-900 border border-primary-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-primary-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-[15px] text-gray-100 font-medium">
                    Briefings enviados
                  </span>

                  <div className="flex bg-primary-800 rounded-lg p-1 border border-primary-700">
                    <button
                      onClick={() => changeViewMode("list")}
                      className={`p-1.5 rounded-md transition-all ${
                        viewMode === "list"
                          ? "bg-primary-600 text-gray-100 shadow-sm"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                      title="Lista"
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
                      onClick={() => changeViewMode("board")}
                      className={`p-1.5 rounded-md transition-all ${
                        viewMode === "board"
                          ? "bg-primary-600 text-gray-100 shadow-sm"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                      title="Quadros"
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
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[13px] text-gray-400">
                    {totalEnvios === 0
                      ? "Nenhum envio"
                      : totalEnvios === 1
                      ? "1 envio"
                      : `${totalEnvios} envios`}
                  </div>

                  <div className="relative">
                    <select
                      value={filtroEnvioStatus}
                      onChange={(e) =>
                        setFiltroEnvioStatus(
                          e.target.value as FiltroEnvioStatus
                        )
                      }
                      className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-[13px] text-gray-100 appearance-none"
                    >
                      <option value="">Todos</option>
                      <option value="pendente">Pendentes</option>
                      <option value="respondido">Respondidos</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
                      ▼
                    </span>
                  </div>
                </div>
              </div>

              {viewMode === "list" && (
                <div className="px-6 py-3 border-b border-primary-800 text-[13px] text-gray-400 grid grid-cols-[2.2fr,1.4fr,1.2fr,1fr,1.2fr] gap-4">
                  <div>Cliente</div>
                  <div>Projeto</div>
                  <div>Briefing</div>
                  <div>Status</div>
                  <div className="text-right">Enviado / Prazo / Ações</div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto briefings-scroll">
                {loading ? (
                  <div className="py-16 text-center text-gray-400 text-sm">
                    Carregando envios...
                  </div>
                ) : erro ? (
                  <div className="py-16 text-center text-red-400 text-sm">
                    {erro}
                  </div>
                ) : enviosFiltrados.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-sm">
                    Nenhum envio encontrado com os filtros atuais.
                  </div>
                ) : viewMode === "board" ? (
                  renderBoardView()
                ) : (
                  <div className="divide-y divide-primary-800/80">
                    {enviosFiltrados.map((envio) => {
                      const status = statusEnvioVisual(envio);
                      const tipoEnvio = classificarEnvio(
                        envio,
                        respostasPorProjeto
                      );
                      const projeto = projetoDoEnvio(envio);
                      const cliente = projeto?.clientes || null;
                      const foto =
                        cliente?.foto_url || "/cliente_placeholder.svg";
                      const enviadoEm = formatarDataCurta(envio.created_at);
                      const totalRespostas =
                        envio.projeto_id &&
                        (respostasPorProjeto[envio.projeto_id] || 0);
                      const prazoResStr = envio.prazo_resposta
                        ? formatarDataCurta(envio.prazo_resposta)
                        : null;
                      
                      const templateTitulo = envio.template?.titulo || "Briefing";
                      const projetoTitulo = projeto?.titulo || "Projeto";
                      const isRespondido = tipoEnvio === "respondido";

                      return (
                        <div
                          key={envio.id}
                          className="grid grid-cols-[2.2fr,1.4fr,1.2fr,1fr,1.2fr] gap-4 px-6 py-4 items-center hover:bg-primary-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Image
                              src={foto}
                              alt="Cliente"
                              width={40}
                              height={40}
                              className="rounded-full object-cover border border-primary-700"
                            />
                            <div className="flex flex-col">
                              <span className="text-[14px] text-gray-100">
                                {cliente?.nome || "Cliente não informado"}
                              </span>
                              <span className="text-[12px] text-gray-400">
                                {cliente?.empresa || ""}
                              </span>
                            </div>
                          </div>

                          <div className="text-[14px] text-gray-100">
                            {projeto?.titulo || "Projeto não definido"}
                          </div>

                          <div className="text-[14px] text-gray-100">
                            {envio.template?.titulo || "Briefing"}
                          </div>

                          <div>
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium ${status.bg} ${status.text}`}
                            >
                              {status.label}
                            </span>
                            {totalRespostas ? (
                              <span className="ml-2 text-[11px] text-gray-300">
                                ({totalRespostas} resposta
                                {totalRespostas > 1 ? "s" : ""})
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-end gap-3 text-[12px] text-gray-300">
                            <div className="flex flex-col text-right">
                              <span>Enviado: {enviadoEm}</span>
                              {prazoResStr && (
                                <span>Prazo: {prazoResStr}</span>
                              )}
                            </div>

                            {tipoEnvio === "respondido" && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/dashboard/briefings/${envio.id}/respostas`
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 border border-primary-500 text-[12px] text-primary-100"
                              >
                                Ver respostas
                              </button>
                            )}

                            {tipoEnvio === "pendente" && (
                              <button
                                onClick={() => reenviarEnvio(envio)}
                                className="px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 border border-primary-500 text-[12px] text-primary-100"
                              >
                                Reenviar
                              </button>
                            )}

                            <div
                              className="relative"
                              data-envio-menu-trigger
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuEnvioId((cur) =>
                                    cur === envio.id ? null : envio.id
                                  );
                                }}
                                className="p-1.5 hover:bg-primary-700 rounded-md transition-colors"
                              >
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>

                              {openMenuEnvioId === envio.id && (
                                <div className="absolute right-8 top-8 w-48 bg-primary-800 border border-primary-600 rounded-xl shadow-xl z-20 flex flex-col overflow-hidden animate-fade-in">
                                  {isRespondido &&
                                    envio.projeto_id &&
                                    envio.template_id && (
                                      <button
                                        onClick={() => {
                                          setOpenMenuEnvioId(null);
                                          abrirModalVisualizar(envio.template_id);
                                        }}
                                        className="w-full text-left px-4 py-3 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2 border-b border-primary-700/50"
                                      >
                                        <Eye
                                          size={14}
                                          className="text-gray-400"
                                        />
                                        Ver respostas
                                      </button>
                                    )}

                                  <button
                                    onClick={() => {
                                      const msg = `Olá! Estou enviando o link do briefing "${templateTitulo}" para o projeto "${projetoTitulo}".\n\nAcesse e responda para darmos continuidade:\n(Link Indisponível)`;
                                      navigator.clipboard.writeText(msg);
                                      alert(
                                        "Mensagem copiada para a área de transferência!"
                                      );
                                      setOpenMenuEnvioId(null);
                                    }}
                                    className="w-full text-left px-4 py-3 text-[13px] text-gray-100 hover:bg-primary-700 flex items-center gap-2"
                                  >
                                    <Copy
                                      size={14}
                                      className="text-gray-400"
                                    />
                                    Copiar mensagem
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenMenuEnvioId(null);
                                      excluirEnvio(envio.id);
                                    }}
                                    className="w-full text-left px-4 py-3 text-[13px] text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 border-t border-primary-700/50"
                                  >
                                    <Trash2 size={14} />
                                    Excluir envio
                                  </button>
                                </div>
                              )}
                            </div>
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

        {/* Barra de Ações em Massa (Floating Action Bar) */}
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
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-xl bg-primary-900 border border-primary-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-[16px] font-semibold text-gray-100">
                    Enviar briefing para cliente
                  </span>
                  <span className="text-[13px] text-gray-400">
                    Escolha o modelo, selecione um ou mais projetos e defina um
                    prazo opcional para resposta.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={fecharModalEnvio}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-800 text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {sendError && (
                <div className="px-4 py-3 rounded-xl bg-rose-900/20 border border-rose-500/50 text-rose-200 text-[13px] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                   {sendError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] text-gray-300 mb-1">
                    Modelo de briefing
                  </label>

                  <div className="relative">
                    <select
                      value={sendSelectedTemplateId || ""}
                      onChange={(e) =>
                        setSendSelectedTemplateId(
                          e.target.value ? e.target.value : null
                        )
                      }
                      className="w-full bg-primary-800 border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all appearance-none"
                    >
                      <option value="">Selecione um modelo</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.titulo}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
                      ▼
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] text-gray-300">
                    Projetos que receberão o briefing
                  </label>

                  {sendSelectedProjetos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                      {sendSelectedProjetos.map((pid) => {
                        const p = projetos.find((proj) => proj.id === pid);
                        const cliente = p?.clientes;
                        return (
                          <div
                            key={pid}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-800 border border-primary-600 text-[12px] text-gray-100"
                          >
                            <span className="truncate max-w-[160px]">
                              {p?.titulo || "Projeto"}
                              {cliente?.nome ? ` — ${cliente.nome}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleProjetoSelecionado(pid)}
                              className="text-gray-400 hover:text-rose-300"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="w-full bg-primary-900/70 border border-primary-700 rounded-xl p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sendSearchProjeto}
                        onChange={(e) => setSendSearchProjeto(e.target.value)}
                        placeholder="Buscar por nome do projeto ou cliente..."
                        className="flex-1 bg-transparent outline-none text-[14px] text-gray-100 placeholder-primary-400"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto flex flex-col gap-1">
                      {projetosFiltradosModal.length === 0 ? (
                        <div className="text-[12px] text-gray-500 py-4 text-center">
                          Nenhum projeto encontrado com este filtro.
                        </div>
                      ) : (
                        projetosFiltradosModal.map((p) => {
                          const cliente = p.clientes;
                          const selected = sendSelectedProjetos.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProjetoSelecionado(p.id)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-[13px] ${
                                selected
                                  ? "bg-primary-700 border border-primary-500 text-primary-50"
                                  : "bg-primary-900/40 border border-transparent text-gray-200 hover:bg-primary-800/70 hover:border-primary-700"
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {p.titulo}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {cliente?.nome ||
                                    cliente?.empresa ||
                                    "Cliente não definido"}
                                </span>
                              </div>
                              <div className="text-[11px]">
                                {selected ? "Selecionado" : "Selecionar"}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-500 mt-1">
                    Você pode enviar para apenas um projeto ou selecionar vários
                    de uma vez.
                  </span>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-[13px] text-gray-300">
                    Prazo para resposta (opcional)
                  </label>
                  <input
                    type="date"
                    value={sendPrazo}
                    onChange={(e) => setSendPrazo(e.target.value)}
                    className="w-full bg-primary-800 border-primary-700 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-primary-800">
                <div className="text-[12px] text-gray-500">
                  {sendSelectedProjetos.length === 0
                    ? "Nenhum projeto selecionado ainda."
                    : sendSelectedProjetos.length === 1
                    ? "1 projeto selecionado."
                    : `${sendSelectedProjetos.length} projetos selecionados.`}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={fecharModalEnvio}
                    disabled={sending}
                    className="px-4 py-2 rounded-lg text-[13px] text-gray-300 hover:bg-primary-800 disabled:opacity-60"
                  >
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
                    {sending ? "Enviando..." : "Enviar briefing"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[85vh] bg-primary-900 border border-primary-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-primary-800 flex items-start justify-between gap-4 bg-primary-900/50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                     <span className="p-2 rounded-lg bg-primary-800 text-primary-200">
                        <FileText size={20} />
                     </span>
                     <span className="text-[18px] font-semibold text-gray-100">
                       {viewTemplate?.titulo || "Modelo de briefing"}
                     </span>
                  </div>
                  {viewTemplate?.descricao && (
                    <span className="ml-[52px] text-[14px] text-gray-400 leading-relaxed max-w-xl">
                      {viewTemplate.descricao}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => {
                        fecharModalVisualizar();
                        if (viewTemplate?.id) {
                            router.push(`/dashboard/briefings/novo?edit=${viewTemplate.id}`);
                        }
                     }}
                     className="p-2.5 rounded-xl hover:bg-primary-800 text-gray-400 hover:text-primary-100 transition-colors"
                     title="Editar este modelo"
                   >
                     <Pencil size={18} />
                   </button>
                   <button
                     type="button"
                     onClick={fecharModalVisualizar}
                     className="p-2.5 rounded-xl hover:bg-primary-800 text-gray-400 hover:text-gray-100 transition-colors"
                   >
                     <X size={20} />
                   </button>
                </div>
              </div>

              {viewError && (
                <div className="m-6 px-4 py-3 rounded-xl bg-rose-900/20 border border-rose-500/50 text-rose-200 text-[13px] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                   {viewError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto briefings-scroll p-6 bg-primary-950/30">
                {viewLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Carregando formulário...</span>
                  </div>
                ) : viewCampos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                    <ClipboardList size={32} strokeWidth={1.5} className="opacity-50" />
                    <span className="text-sm">Nenhuma pergunta configurada neste modelo.</span>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto flex flex-col gap-6">
                    {viewCampos.map((campo, index) => (
                      <div
                        key={campo.id}
                        className="group bg-primary-900 border border-primary-800 hover:border-primary-700 rounded-2xl p-5 shadow-sm transition-all"
                      >
                        <div className="flex flex-col gap-3">
                           <div className="flex items-start justify-between gap-4">
                              <span className="text-[16px] text-gray-100 font-medium leading-tight">
                                {campo.titulo_pergunta}
                                {campo.obrigatorio && (
                                  <span className="text-rose-400 ml-1" title="Obrigatório">*</span>
                                )}
                              </span>
                              
                              <span className="shrink-0 text-[11px] uppercase tracking-wider font-semibold text-primary-400 bg-primary-950/50 px-2 py-1 rounded-md border border-gray-700">
                                {labelTipoCampo(campo.tipo)}
                              </span>
                           </div>
                           
                           {campo.descricao_pergunta && (
                             <span className="text-[13px] text-gray-400 -mt-1">
                               {campo.descricao_pergunta}
                             </span>
                           )}

                           <div className="pt-2">
                              {campo.tipo === "short_text" && (
                                <div className="w-full h-11 rounded-xl border border-primary-700 bg-primary-950/50 px-4 flex items-center text-[13px] text-gray-500 italic pointer-events-none">
                                  Resposta curta...
                                </div>
                              )}

                              {campo.tipo === "long_text" && (
                                <div className="w-full h-24 rounded-xl border border-primary-700 bg-primary-950/50 px-4 py-3 text-[13px] text-gray-500 italic pointer-events-none">
                                  Resposta longa...
                                </div>
                              )}

                              {(campo.tipo === "multiple_choice" || campo.tipo === "checkboxes") && (
                                <div className="flex flex-col gap-2.5">
                                  {campo.opcoes && campo.opcoes.length > 0 ? (
                                    campo.opcoes.map((op, i) => (
                                      <div key={i} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border border-primary-600 bg-primary-800/50 ${campo.tipo === "multiple_choice" ? "rounded-full" : "rounded-md"}`} />
                                        <span className="text-[14px] text-gray-300">{op}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[12px] text-gray-500 italic">
                                      Sem opções definidas.
                                    </span>
                                  )}
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {deleteModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
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
    </div>
  );
}