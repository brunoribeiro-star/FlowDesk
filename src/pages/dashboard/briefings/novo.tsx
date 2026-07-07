"use client";

import { useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import ColorPicker from "@/components/ui/ColorPicker";
import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Trash2,
  X,
  Plus,
  Copy,
  Star,
  Heart,
  Zap,
  Flag,
  Bookmark,
  MessageCircle,
  Hash,
  Link,
  Info,
  AlertCircle,
  Settings,
  User,
  Users,
  Briefcase,
  Folder,
  FileText,
  Image as ImageIcon,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Sun,
  Moon,
  Smile,
  ThumbsUp,
  Award,
  Layout,
  LayoutGrid,
  List,
  Target,
  TrendingUp,
  PieChart,
  BarChart,
  Activity,
  Box,
  Package,
  Truck,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Monitor,
  Smartphone,
  Tablet,
  Camera,
  Video,
  Music,
  Mic,
  Speaker,
  Headphones,
  Bell,
  Mail,
  Phone,
  Send as SendIcon,
  Share2,
  Printer,
  Download,
  Upload,
  Cloud,
  Database,
  Server,
  Lock,
  Unlock,
  Key,
  Shield,
  Eye as EyeIcon,
} from "lucide-react";

const ICON_LIST = {
  FileText,
  Star,
  Heart,
  Zap,
  Flag,
  Bookmark,
  MessageCircle,
  Hash,
  Link,
  Info,
  AlertCircle,
  Settings,
  User,
  Users,
  Briefcase,
  Folder,
  ImageIcon,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Sun,
  Moon,
  Smile,
  ThumbsUp,
  Award,
  Layout,
  LayoutGrid,
  List,
  Target,
  TrendingUp,
  PieChart,
  BarChart,
  Activity,
  Box,
  Package,
  Truck,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Monitor,
  Smartphone,
  Tablet,
  Camera,
  Video,
  Music,
  Mic,
  Speaker,
  Headphones,
  Bell,
  Mail,
  Phone,
  SendIcon,
  Share2,
  Printer,
  Download,
  Upload,
  Cloud,
  Database,
  Server,
  Lock,
  Unlock,
  Key,
  Shield,
  EyeIcon,
};

type QuestionType = "short" | "long" | "single" | "multi";

type LocalQuestion = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: QuestionType;
  opcoes: string[];
  obrigatorio: boolean;
};

function mapTipoToDb(tipo: QuestionType) {
  if (tipo === "short") return "short_text";
  if (tipo === "long") return "long_text";
  if (tipo === "single") return "multiple_choice";
  return "checkboxes";
}

function mapDbToTipo(dbTipo: string): QuestionType {
  if (dbTipo === "short_text") return "short";
  if (dbTipo === "long_text") return "long";
  if (dbTipo === "multiple_choice") return "single";
  return "multi";
}

export default function NovoBriefingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const projetoId = searchParams.get("projeto_id");


  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const [cardBgColor, setCardBgColor] = useState("#0f172a");
  const [cardTextColor, setCardTextColor] = useState("#ffffff");
  
  const [coverIcon, setCoverIcon] = useState<string>("FileText");
  const [coverIconColor, setCoverIconColor] = useState<string>("#ffffff");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [questions, setQuestions] = useState<LocalQuestion[]>([
    {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      titulo: "",
      descricao: "",
      tipo: "short",
      opcoes: [],
      obrigatorio: false,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function carregarUser() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      setUser(u);
      setLoadingUser(false);
      if (!u) router.push("/login");

      if (u && editId) {
        const { data: tpl, error: tplErr } = await supabase
          .from("briefings_templates")
          .select("*")
          .eq("id", editId)
          .single();

        if (tpl && !tplErr) {
          setTitulo(tpl.titulo);
          setDescricao(tpl.descricao || "");
          setCardBgColor(tpl.card_bg_color || "#0f172a");
          setCardTextColor(tpl.card_text_color || "#ffffff");
          setCoverIcon(tpl.cover_icon || "FileText");
          setCoverIconColor(tpl.cover_icon_color || "#ffffff");

          const { data: fields } = await supabase
            .from("briefings_campos")
            .select("*")
            .eq("template_id", editId)
            .order("ordem");

          if (fields && fields.length > 0) {
            const mapped: LocalQuestion[] = fields.map((f: any) => ({
              id: String(f.id),
              titulo: f.titulo_pergunta,
              descricao: f.descricao_pergunta || "",
              tipo: mapDbToTipo(f.tipo),
              opcoes: f.opcoes || [],
              obrigatorio: f.obrigatorio,
            }));
            setQuestions(mapped);
          } else {
             setQuestions([]);
          }
        }
      }
    }
    carregarUser();
  }, [router, editId]);

  useEffect(() => {
    if (editId) return;
    try {
      const saved = sessionStorage.getItem("briefingDraftNew");
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.titulo) setTitulo(draft.titulo);
      if (draft.descricao !== undefined) setDescricao(draft.descricao);
      if (draft.cardBgColor) setCardBgColor(draft.cardBgColor);
      if (draft.cardTextColor) setCardTextColor(draft.cardTextColor);
      if (draft.coverIcon) setCoverIcon(draft.coverIcon);
      if (draft.coverIconColor) setCoverIconColor(draft.coverIconColor);
      if (draft.questions && Array.isArray(draft.questions) && draft.questions.length > 0) {
        setQuestions(draft.questions);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (editId) return;
    const draft = { titulo, descricao, cardBgColor, cardTextColor, coverIcon, coverIconColor, questions };
    sessionStorage.setItem("briefingDraftNew", JSON.stringify(draft));
  }, [titulo, descricao, cardBgColor, cardTextColor, coverIcon, coverIconColor, questions, editId]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const avatarSrc = user?.user_metadata?.avatar_url || null;
  const avatarName = user?.user_metadata?.nome || user?.email?.split("@")[0] || null;

  function createEmptyQuestion(): LocalQuestion {
    return {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      titulo: "",
      descricao: "",
      tipo: "short",
      opcoes: [],
      obrigatorio: false,
    };
  }

  function handleAddQuestion() {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  }

  function handleDuplicateQuestion(qid: string) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx === -1) return prev;
      const original = prev[idx];
      const clone: LocalQuestion = {
        ...original,
        id: String(Date.now()) + Math.random().toString(36).slice(2),
      };
      const novo = [...prev];
      novo.splice(idx + 1, 0, clone);
      return novo;
    });
  }

  function handleRemoveQuestion(qid: string) {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((q) => q.id !== qid);
    });
  }

  function handleMoveUp(qid: string) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx <= 0) return prev;
      const novo = [...prev];
      const [item] = novo.splice(idx, 1);
      novo.splice(idx - 1, 0, item);
      return novo;
    });
  }

  function handleMoveDown(qid: string) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const novo = [...prev];
      const [item] = novo.splice(idx, 1);
      novo.splice(idx + 1, 0, item);
      return novo;
    });
  }

  function updateQuestion(
    qid: string,
    patch: Partial<Omit<LocalQuestion, "id">>
  ) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qid ? { ...q, ...patch } : q))
    );
  }

  function handleChangeTipo(qid: string, value: string) {
    const tipo: QuestionType =
      value === "short"
        ? "short"
        : value === "long"
        ? "long"
        : value === "single"
        ? "single"
        : "multi";

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        let opcoes = q.opcoes;
        if ((tipo === "single" || tipo === "multi") && opcoes.length === 0) {
          opcoes = ["Opção 1"];
        }
        return { ...q, tipo, opcoes };
      })
    );
  }

  function addOpcao(qid: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const nextIndex = q.opcoes.length + 1;
        return {
          ...q,
          opcoes: [...q.opcoes, `Opção ${nextIndex}`],
        };
      })
    );
  }

  function updateOpcao(qid: string, index: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opcoes = [...q.opcoes];
        opcoes[index] = value;
        return { ...q, opcoes };
      })
    );
  }

  function removeOpcao(qid: string, index: number) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opcoes = q.opcoes.filter((_, i) => i !== index);
        return { ...q, opcoes };
      })
    );
  }

  async function handleSave() {
    if (!user) {
      setFormError("Usuário não autenticado.");
      return;
    }

    const tituloTrim = titulo.trim();
    if (!tituloTrim) {
      setFormError("Dê um nome ao briefing.");
      return;
    }

    const perguntasValidas = questions.filter(
      (q) => q.titulo.trim().length > 0
    );
    if (perguntasValidas.length === 0) {
      setFormError("Crie pelo menos uma pergunta com título preenchido.");
      return;
    }

    setFormError(null);
    setSaving(true);

    try {
      let templateData;
      let tplError;

      if (editId) {
        const { data, error } = await supabase
          .from("briefings_templates")
          .update({
             titulo: tituloTrim,
             descricao: descricao.trim() || null,
             updated_at: new Date().toISOString(),
             card_bg_color: cardBgColor || "#0f172a",
             card_text_color: cardTextColor || "#ffffff",
             cover_icon: coverIcon,
             cover_icon_color: coverIconColor,
          })
          .eq("id", editId)
          .select("id")
          .single();
        
        templateData = data;
        tplError = error;
      } else {
        const { data, error } = await supabase
          .from("briefings_templates")
          .insert({
            user_id: user.id,
            titulo: tituloTrim,
            descricao: descricao.trim() || null,
            updated_at: new Date().toISOString(),
            card_bg_color: cardBgColor || "#0f172a",
            card_text_color: cardTextColor || "#ffffff",
            cover_icon: coverIcon,
            cover_icon_color: coverIconColor,
          })
          .select("id")
          .single();
          
          templateData = data;
          tplError = error;
      }

      if (tplError || !templateData) {
        setFormError(tplError?.message || "Erro ao criar template.");
        setSaving(false);
        return;
      }

      const templateId = String(templateData.id);

      if (editId) {
        const { error: deleteErr } = await supabase
          .from("briefings_campos")
          .delete()
          .eq("template_id", templateId);
        if (deleteErr) {
          setFormError("Erro ao atualizar campos: " + deleteErr.message);
          setSaving(false);
          return;
        }
      }

      const payloadCampos = questions.map((q, index) => ({
        user_id: user.id,
        template_id: templateId,
        ordem: index + 1,
        tipo: mapTipoToDb(q.tipo),
        titulo_pergunta: q.titulo.trim(),
        descricao_pergunta: q.descricao.trim() || null,
        opcoes:
          (q.tipo === "single" || q.tipo === "multi") && q.opcoes.length > 0
            ? q.opcoes
            : null,
        obrigatorio: q.obrigatorio,
      }));

      const { error: camposError } = await supabase
        .from("briefings_campos")
        .insert(payloadCampos);

      if (camposError) {
        setFormError(
          camposError.message || "Erro ao salvar campos do briefing."
        );
        setSaving(false);
        return;
      }

      if (!editId && projetoId) {
        await supabase.from("briefings_envios").insert({
          user_id: user.id,
          template_id: templateId,
          projeto_id: projetoId,
          cliente_id: null,
          status: "pendente",
          token: crypto.randomUUID(),
          email_enviado: false,
        });
      }

      sessionStorage.removeItem("briefingDraftNew");
      setShowSuccessModal(true);
      setSaving(false);
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado ao salvar briefing.");
      setSaving(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <span className="text-gray-400 text-sm">Carregando editor...</span>
        </div>
      </div>
    );
  }

  const TIPO_LABEL: Record<QuestionType, string> = {
    short: "Resposta Curta",
    long: "Parágrafo",
    single: "Múltipla Escolha",
    multi: "Caixas de Seleção",
  };

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in p-4">
          <div className="bg-primary-900 border border-primary-700 rounded-2xl p-6 sm:p-8 w-full max-w-md text-center flex flex-col gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-primary-400" style={{ background: 'rgba(30,182,232,0.10)' }}>
              <CheckSquare size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] font-semibold text-gray-100">Briefing {editId ? "atualizado" : "criado"}!</h2>
              <p className="text-gray-400 text-sm">
                {editId ? "As alterações foram salvas com sucesso." : "Seu novo modelo de briefing está pronto para uso."}
              </p>
            </div>
            {projetoId ? (
              <div className="flex flex-col gap-2">
                <button onClick={() => router.push(`/dashboard/projetos/${projetoId}`)}
                  className="w-full px-6 py-3 rounded-xl text-primary-900 font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)', boxShadow: '0 12px 28px -12px rgba(30,182,232,0.8)' }}>
                  Voltar ao projeto
                </button>
                <button onClick={() => router.push("/dashboard/briefings")}
                  className="w-full px-6 py-3 rounded-xl bg-transparent hover:bg-primary-800 text-gray-400 text-[13px] transition-all">
                  Ver todos os briefings
                </button>
              </div>
            ) : (
              <button onClick={() => router.push("/dashboard/briefings")}
                className="w-full px-6 py-3 rounded-xl text-primary-900 font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)', boxShadow: '0 12px 28px -12px rgba(30,182,232,0.8)' }}>
                Voltar para a lista
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-primary-900">
        <div className="pointer-events-none absolute rounded-full z-0" style={{ width: 520, height: 520, right: -180, top: -180, background: 'radial-gradient(circle, rgba(30,182,232,0.10), transparent 70%)', filter: 'blur(100px)' }} />
        <div className="pointer-events-none absolute rounded-full z-0" style={{ width: 460, height: 460, right: -160, bottom: -200, background: 'radial-gradient(circle, rgba(16,66,83,0.45), transparent 70%)', filter: 'blur(100px)' }} />

        <header className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5 px-4 sm:px-6 lg:px-10 py-4 sm:py-[22px] border-b border-gray-700 flex-none">
          <div className="flex items-center gap-3 sm:gap-[18px] min-w-0">
            <button
              type="button"
              onClick={() => router.push(projetoId ? `/dashboard/projetos/${projetoId}` : "/dashboard/briefings")}
              className="grid place-items-center flex-none w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-[13px] border border-gray-700 text-gray-200 transition-all duration-200 hover:border-primary-500 hover:text-primary-300"
              style={{ background: 'var(--primary-800)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
              </svg>
            </button>
            <span className="text-[16px] sm:text-[19px] font-semibold text-gray-100 truncate">
              {editId ? "Editar Briefing" : "Novo Modelo de Briefing"}
            </span>
          </div>

          <div className="flex items-center gap-3 lg:ml-auto lg:gap-3.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 rounded-[14px] text-[15px] sm:text-[16px] font-semibold border-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)', color: 'var(--primary-900)', boxShadow: '0 12px 28px -12px rgba(30,182,232,0.8)' }}
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-primary-900/40 border-t-primary-900 rounded-full animate-spin" /> Salvando...</>
              ) : "Salvar alterações"}
            </button>

            <div className="relative flex-none" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 p-1 rounded-full border border-gray-600 transition-all hover:border-primary-500"
                style={{ background: 'var(--primary-800)' }}
              >
                <UserAvatar src={avatarSrc} name={avatarName} size={38} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-52 p-2 rounded-2xl border border-gray-600 z-50 animate-fade-in-down flex flex-col gap-1"
                  style={{ background: 'var(--primary-800)', boxShadow: '0 30px 70px -24px rgba(0,0,0,0.8)' }}>
                  <button onClick={() => { setProfileOpen(false); router.push("/dashboard/configuracoes"); }}
                    className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-[10px] text-[14px] text-gray-100 bg-transparent border-0 cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)]">
                    <Pencil size={16} className="text-gray-400" /> Editar perfil
                  </button>
                  <div className="h-px my-1 mx-2 bg-gray-700" />
                  <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                    className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-[10px] text-[14px] text-error-medium bg-transparent border-0 cursor-pointer transition-colors hover:bg-[rgba(239,83,80,0.10)]">
                    <Trash2 size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto novo-briefing-scroll">
          <div className="max-w-[1180px] w-full mx-auto flex flex-col gap-5 lg:gap-[26px] px-4 sm:px-6 lg:px-10 py-5 lg:py-[34px] pb-6 lg:pb-[44px]">

            {formError && (
              <div className="px-5 py-4 rounded-xl border text-[14px] flex items-center gap-3 animate-fade-in"
                style={{ background: 'rgba(239,83,80,0.08)', borderColor: 'rgba(239,83,80,0.3)', color: 'var(--error-light)' }}>
                <div className="w-2 h-2 rounded-full bg-error-medium shrink-0" />
                {formError}
              </div>
            )}

            <section className="relative rounded-[22px] border border-gray-700 px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-[36px] pb-6 sm:pb-8 lg:pb-10"
              style={{ background: 'var(--primary-800)' }}>
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[22px]" style={{ background: 'linear-gradient(90deg, var(--primary-300), var(--primary-500) 50%, transparent)' }} />

              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título do Briefing"
                className="w-full bg-transparent outline-none border-none p-0 font-bold text-gray-100 text-[26px] sm:text-[34px] lg:text-[42px]"
                style={{ letterSpacing: '-0.02em', caretColor: 'var(--primary-500)' }}
              />
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Adicione uma descrição ou instruções para o cliente preencher este briefing…"
                className="w-full bg-transparent outline-none border-none p-0 text-gray-200 mt-[18px] text-[15px] sm:text-[18px]"
              />

              <div className="h-px my-7 bg-gray-700" />

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-11 relative z-20">
                <div className="flex flex-col gap-[22px]">
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-[11px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gray-400">Cor de fundo</span>
                      <ColorPicker value={cardBgColor} onChange={setCardBgColor} />
                    </div>
                    <div className="flex flex-col gap-[11px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gray-400">Cor do texto</span>
                      <ColorPicker value={cardTextColor} onChange={setCardTextColor} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[11px] relative z-30">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gray-400">Ícone da capa</span>
                    <div className="flex gap-3 relative">
                      <button
                        type="button"
                        onClick={() => setIconPickerOpen(!iconPickerOpen)}
                        className="flex items-center gap-[10px] flex-1 min-w-0 h-[52px] px-4 rounded-[13px] border border-gray-600 text-gray-100 cursor-pointer transition-colors hover:border-gray-400"
                        style={{ background: 'var(--primary-800)', fontSize: 15 }}
                      >
                        {ICON_LIST[coverIcon as keyof typeof ICON_LIST] ? (
                          (() => {
                            const Ic = ICON_LIST[coverIcon as keyof typeof ICON_LIST];
                            return <><Ic size={17} style={{ color: 'var(--primary-300)' }} className="flex-none" /><span className="truncate">{coverIcon}</span></>;
                          })()
                        ) : <span className="text-gray-500">Selecionar</span>}
                        <ChevronDown size={15} className="ml-auto text-gray-500 flex-none" />
                      </button>

                      <ColorPicker value={coverIconColor} onChange={setCoverIconColor} />

                      {iconPickerOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIconPickerOpen(false)} />
                          <div className="absolute top-full mt-2 left-0 w-[360px] max-w-[calc(100vw-2.5rem)] border border-gray-700 shadow-2xl rounded-xl p-4 z-50 grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto novo-briefing-scroll animate-fade-in-down"
                            style={{ background: 'var(--primary-800)' }}>
                            {Object.keys(ICON_LIST).map((iconName) => {
                              const IconComp = ICON_LIST[iconName as keyof typeof ICON_LIST];
                              return (
                                <button key={iconName} type="button"
                                  onClick={() => { setCoverIcon(iconName); setIconPickerOpen(false); }}
                                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${coverIcon === iconName ? "bg-primary-700 text-gray-100 ring-2 ring-primary-500" : "text-gray-400 hover:bg-primary-800 hover:text-gray-100"}`}
                                  title={iconName}>
                                  <IconComp size={20} />
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-[18px] min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] p-6 sm:p-8 lg:p-10 rounded-[20px] transition-all duration-300"
                  style={{ background: cardBgColor, color: cardTextColor, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
                  {coverIcon && ICON_LIST[coverIcon as keyof typeof ICON_LIST] && (() => {
                    const Ic = ICON_LIST[coverIcon as keyof typeof ICON_LIST];
                    return <Ic size={48} strokeWidth={1.6} style={{ color: coverIconColor }} />;
                  })()}
                  <h3 className="m-0 text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-center leading-tight" style={{ letterSpacing: '-0.01em' }}>
                    {titulo || "Título do Briefing"}
                  </h3>
                  <span className="text-[13px] font-semibold opacity-70" style={{ letterSpacing: '0.28em' }}>BRIEFING</span>
                </div>
              </div>
            </section>

            {questions.map((q, idx) => (
              <section
                key={q.id}
                className="rounded-[20px] border border-gray-700 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-7"
                style={{ background: 'var(--primary-800)' }}
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 sm:flex-1">
                    <span
                      className="flex-none grid place-items-center w-11 h-11 rounded-[12px] text-[17px] font-bold text-primary-300"
                      style={{ background: 'rgba(30,182,232,0.10)', border: '1px solid rgba(30,182,232,0.28)' }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      value={q.titulo}
                      onChange={(e) => updateQuestion(q.id, { titulo: e.target.value })}
                      placeholder="Digite a pergunta aqui"
                      className="flex-1 min-w-0 h-14 px-5 rounded-[14px] border border-gray-600 bg-primary-800 text-gray-100 text-[17px] outline-none transition-all focus:border-primary-500"
                      style={{ caretColor: 'var(--primary-500)' }}
                    />
                  </div>
                  <div className="relative flex-none w-full sm:w-[240px]">
                    <select
                      value={q.tipo}
                      onChange={(e) => handleChangeTipo(q.id, e.target.value)}
                      className="w-full h-14 px-4 pr-10 rounded-[14px] border border-gray-600 text-gray-100 text-[15px] outline-none appearance-none cursor-pointer transition-colors hover:border-gray-400 focus:border-primary-500"
                      style={{ background: 'var(--primary-800)' }}
                    >
                      <option value="short" className="bg-primary-900">Resposta Curta</option>
                      <option value="long" className="bg-primary-900">Parágrafo</option>
                      <option value="single" className="bg-primary-900">Múltipla Escolha</option>
                      <option value="multi" className="bg-primary-900">Caixas de Seleção</option>
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>

                <input
                  value={q.descricao}
                  onChange={(e) => updateQuestion(q.id, { descricao: e.target.value })}
                  placeholder="Descrição auxiliar (opcional)"
                  className="w-full mt-4 px-1 py-2 bg-transparent outline-none text-gray-400 text-[15px] border-0 transition-colors"
                  style={{ caretColor: 'var(--primary-500)' }}
                />

                {(q.tipo === "single" || q.tipo === "multi") && (
                  <div className="mt-4 flex flex-col gap-2 pl-1">
                    {q.opcoes.map((op, opIdx) => (
                      <div key={opIdx} className="flex items-center gap-3 group/opt">
                        <div className={`w-4 h-4 shrink-0 border border-gray-600 ${q.tipo === "single" ? "rounded-full" : "rounded-sm"}`} />
                        <input
                          value={op}
                          onChange={(e) => updateOpcao(q.id, opIdx, e.target.value)}
                          placeholder={`Opção ${opIdx + 1}`}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-primary-500 text-[14px] text-gray-200 py-1 outline-none transition-colors"
                        />
                        <button type="button" onClick={() => removeOpcao(q.id, opIdx)}
                          className="opacity-0 group-hover/opt:opacity-100 p-1.5 rounded-lg transition-all text-error-medium hover:bg-[rgba(239,83,80,0.10)]">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOpcao(q.id)}
                      className="mt-2 w-fit flex items-center gap-2 text-[13px] font-medium text-primary-400 hover:text-primary-300 px-2 py-1 -ml-2 rounded-lg hover:bg-[rgba(30,182,232,0.06)] transition-colors">
                      <Plus size={16} /> Adicionar opção
                    </button>
                  </div>
                )}

                <div className="mt-[22px] mb-[2px] h-px bg-gray-700" />
                <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => handleDuplicateQuestion(q.id)}
                      className="grid place-items-center w-[38px] h-[38px] rounded-[10px] border-0 bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-[rgba(148,169,173,0.10)] hover:text-gray-100" title="Duplicar">
                      <Copy size={18} />
                    </button>
                    <button type="button" onClick={() => handleRemoveQuestion(q.id)}
                      className="grid place-items-center w-[38px] h-[38px] rounded-[10px] border-0 bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-[rgba(239,83,80,0.10)] hover:text-error-medium" title="Excluir">
                      <Trash2 size={18} />
                    </button>
                    <span className="w-px h-6 bg-gray-700 mx-2" />
                    <button type="button" onClick={() => handleMoveUp(q.id)}
                      className="grid place-items-center w-[38px] h-[38px] rounded-[10px] border-0 bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-[rgba(148,169,173,0.10)] hover:text-gray-100" title="Mover para cima">
                      <ChevronUp size={18} />
                    </button>
                    <button type="button" onClick={() => handleMoveDown(q.id)}
                      className="grid place-items-center w-[38px] h-[38px] rounded-[10px] border-0 bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-[rgba(148,169,173,0.10)] hover:text-gray-100" title="Mover para baixo">
                      <ChevronDown size={18} />
                    </button>
                  </div>

                  <label className="flex items-center gap-3.5 text-[15.5px] font-medium text-gray-200 cursor-pointer select-none">
                    Obrigatória
                    <button
                      type="button"
                      onClick={() => updateQuestion(q.id, { obrigatorio: !q.obrigatorio })}
                      className="relative w-[50px] h-7 rounded-full border-0 cursor-pointer transition-all duration-200 flex-none"
                      style={q.obrigatorio
                        ? { background: 'linear-gradient(135deg, var(--primary-400), var(--primary-500))', boxShadow: '0 0 14px -3px var(--primary-500)' }
                        : { background: 'var(--gray-600)' }}
                    >
                      <span
                        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-all duration-200"
                        style={{ left: q.obrigatorio ? 25 : 3 }}
                      />
                    </button>
                  </label>
                </div>
              </section>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="flex items-center justify-center gap-3 w-full h-20 rounded-[18px] text-[17px] font-semibold text-gray-300 border-0 cursor-pointer transition-all duration-200 hover:text-primary-200"
              style={{ border: '1.5px dashed var(--gray-600)', background: 'rgba(30,182,232,0.02)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-500)'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,182,232,0.06)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-600)'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,182,232,0.02)'; }}
            >
              <span className="grid place-items-center w-10 h-10 rounded-full border text-primary-300"
                style={{ background: 'rgba(30,182,232,0.10)', borderColor: 'rgba(30,182,232,0.30)' }}>
                <Plus size={20} />
              </span>
              Adicionar nova pergunta
            </button>

          </div>
        </main>
      </div>

      <style jsx global>{`
        .novo-briefing-scroll::-webkit-scrollbar { width: 8px; }
        .novo-briefing-scroll::-webkit-scrollbar-track { background: transparent; }
        .novo-briefing-scroll::-webkit-scrollbar-thumb { background: var(--primary-700); border-radius: 99px; }
        .novo-briefing-scroll::-webkit-scrollbar-thumb:hover { background: var(--primary-600); }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}