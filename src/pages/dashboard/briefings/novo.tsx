"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      setShowSuccessModal(true);
      setSaving(false);
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado ao salvar briefing.");
      setSaving(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center text-[18px]">
        <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"/>
            <span className="text-gray-400 text-sm">Carregando editor...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in">
          <div className="bg-primary-900 border border-primary-700 rounded-2xl p-8 w-[90%] max-w-md text-center flex flex-col gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-2 text-primary-400">
                <CheckSquare size={32} />
            </div>
            
            <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-semibold text-gray-100">
                Briefing {editId ? "atualizado" : "criado"}!
                </h2>
                <p className="text-gray-400 text-sm">
                    {editId 
                        ? "As alterações foram salvas com sucesso." 
                        : "Seu novo modelo de briefing está pronto para uso."}
                </p>
            </div>

            {projetoId ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push(`/dashboard/projetos/${projetoId}`)}
                  className="w-full px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold transition-all shadow-lg shadow-primary-500/20"
                >
                  Voltar ao projeto
                </button>
                <button
                  onClick={() => router.push("/dashboard/briefings")}
                  className="w-full px-6 py-3 rounded-xl bg-transparent hover:bg-primary-800 text-gray-400 text-[13px] transition-all"
                >
                  Ver todos os briefings
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push("/dashboard/briefings")}
                className="w-full px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold transition-all shadow-lg shadow-primary-500/20"
              >
                Voltar para a lista
              </button>
            )}
          </div>
        </div>
      )}

      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex overflow-hidden">
        <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="h-16 border-b border-primary-700 bg-primary-900/50 backdrop-blur-md flex items-center justify-between px-6 md:px-8 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(projetoId ? `/dashboard/projetos/${projetoId}` : "/dashboard/briefings")}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-800 text-gray-400 hover:text-gray-200 transition-colors"
                        title="Voltar"
                    >
                        <ChevronDown className="rotate-90" size={20} />
                    </button>
                    
                    <div className="h-6 w-px bg-primary-800 mx-1" />

                    <h1 className="text-[16px] font-medium text-gray-200">
                         {editId ? "Editar Briefing" : "Novo Modelo de Briefing"}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                     <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
                        saving
                            ? "bg-primary-800 text-gray-500 cursor-not-allowed"
                            : "bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20"
                        }`}
                    >
                        {saving ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            "Salvar alterações"
                        )}
                    </button>

                    <div className="relative" ref={profileRef}>
                        <button
                        type="button"
                        onClick={() => setProfileOpen((v) => !v)}
                        className="rounded-full border border-primary-700 hover:border-primary-500 transition-colors"
                        >
                          <UserAvatar src={avatarSrc} name={avatarName} size={36} />
                        </button>
                         {profileOpen && (
                            <div className="absolute right-0 mt-3 w-56 bg-primary-900 border border-primary-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-fade-in-down origin-top-right">
                                <button
                                    className="w-full text-left px-3 py-2 text-[13px] text-gray-300 hover:text-gray-100 hover:bg-primary-700/50 rounded-lg transition-colors flex items-center gap-2"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        router.push("/dashboard/perfil");
                                    }}
                                >
                                    <Pencil size={14} /> Editar perfil
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 text-[13px] text-rose-400 hover:text-rose-300 hover:bg-rose-900/10 rounded-lg transition-colors flex items-center gap-2 border-t border-primary-700 mt-1 pt-2"
                                    onClick={async () => {
                                        await supabase.auth.signOut();
                                        router.push("/login");
                                    }}
                                >
                                    <Trash2 size={14} /> Sair
                                </button>
                            </div>
                         )}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto novo-briefing-scroll p-6 md:p-8">
                <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20">
                    
                    {formError && (
                        <div className="px-5 py-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-[14px] flex items-center gap-3 animate-fade-in">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            {formError}
                        </div>
                    )}

                    <div className="bg-primary-900 border border-primary-700 rounded-2xl shadow-sm group focus-within:border-primary-600 transition-colors">
                        <div className="h-2 bg-gradient-to-r from-primary-600 to-primary-400 rounded-t-2xl" />
                        <div className="p-6 md:p-8 flex flex-col gap-6">
                            <input
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder="Título do Briefing"
                                className="w-full bg-transparent text-[32px] font-bold text-gray-100 placeholder-gray-600 outline-none border-none p-0 focus:ring-0"
                            />
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Adicione uma descrição ou instruções para o cliente preencher este briefing..."
                                rows={2}
                                className="w-full bg-transparent text-[15px] text-gray-300 placeholder-gray-500 outline-none border-none p-0 focus:ring-0 resize-none"
                            />

                            <div className="w-full h-px bg-gray-700 my-2" />

                            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 relative z-20">
                                
                                <div className="flex flex-col justify-center gap-6 w-fit h-full">
                                     
                                     <div className="flex flex-col gap-6">
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Cor de Fundo</label>
                                                <ColorPicker value={cardBgColor} onChange={setCardBgColor} />
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Cor do Texto</label>
                                                <ColorPicker value={cardTextColor} onChange={setCardTextColor} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 relative z-30">
                                            <label className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Ícone da Capa</label>
                                            <div className="flex gap-2 relative">
                                                <button
                                                    onClick={() => setIconPickerOpen(!iconPickerOpen)}
                                                    className="h-[46px] px-3 bg-transparent border border-primary-700 hover:border-primary-500 rounded-lg flex items-center gap-2 text-gray-300 transition-colors min-w-[140px] justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {ICON_LIST[coverIcon as keyof typeof ICON_LIST] ? (
                                                            <>
                                                                {(() => {
                                                                    const SelectedIcon = ICON_LIST[coverIcon as keyof typeof ICON_LIST];
                                                                    return <SelectedIcon size={18} style={{ color: coverIconColor }} />;
                                                                })()}
                                                                <span className="text-[13px]">{coverIcon}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[13px] text-gray-500">Selecionar</span>
                                                        )}
                                                    </div>
                                                    <ChevronDown size={14} className="text-gray-500" />
                                                </button>

                                                <ColorPicker value={coverIconColor} onChange={setCoverIconColor} />

                                                {iconPickerOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIconPickerOpen(false)} />
                                                        <div className="absolute top-full mt-2 left-0 w-[360px] bg-primary-900 border border-primary-700 shadow-2xl rounded-xl p-4 z-50 grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto novo-briefing-scroll animate-fade-in-down">
                                                            {Object.keys(ICON_LIST).map((iconName) => {
                                                                const IconComp = ICON_LIST[iconName as keyof typeof ICON_LIST];
                                                                return (
                                                                    <button
                                                                        key={iconName}
                                                                        onClick={() => {
                                                                            setCoverIcon(iconName);
                                                                            setIconPickerOpen(false);
                                                                        }}
                                                                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                                                                            coverIcon === iconName 
                                                                                ? "bg-primary-700 text-white ring-2 ring-primary-500" 
                                                                                : "text-gray-400 hover:bg-primary-800 hover:text-white"
                                                                        }`}
                                                                        title={iconName}
                                                                    >
                                                                        <IconComp size={20} />
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                     </div>
                                </div>
                                
                                <div className="h-full flex flex-col justify-center relative">
                                     <div 
                                        className="w-full h-full min-h-[220px] rounded-xl shadow-lg flex flex-col items-center justify-center gap-3 p-6 text-center transition-all duration-300"
                                        style={{ backgroundColor: cardBgColor, color: cardTextColor }}
                                     >
                                        {coverIcon && ICON_LIST[coverIcon as keyof typeof ICON_LIST] && (
                                            (() => {
                                                const IconComp = ICON_LIST[coverIcon as keyof typeof ICON_LIST];
                                                return <IconComp size={48} style={{ color: coverIconColor }} />;
                                            })()
                                        )}
                                        <div className="font-bold text-[24px] leading-tight line-clamp-2 max-w-[80%]">
                                            {titulo || "Título do Briefing"}
                                        </div>
                                        <div className="text-[13px] opacity-80 uppercase tracking-wider font-medium mt-1">Briefing</div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {questions.map((q, idx) => (
                            <div 
                                key={q.id}
                                className="bg-primary-900 border border-primary-700 rounded-2xl transition-all duration-200 hover:border-primary-500 hover:shadow-lg group"
                            >
                                <div className="p-6 md:p-8 flex flex-col gap-6">
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                        <div className="bg-primary-800/50 w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-gray-400 border border-primary-700 shrink-0 mt-1">
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 w-full flex flex-col gap-4">
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <input 
                                                    value={q.titulo}
                                                    onChange={(e) => updateQuestion(q.id, { titulo: e.target.value })}
                                                    placeholder="Digite a pergunta aqui"
                                                    className="flex-1 bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all"
                                                />
                                                
                                                <div className="relative md:w-64 shrink-0">
                                                    <select
                                                        value={q.tipo}
                                                        onChange={(e) => handleChangeTipo(q.id, e.target.value)}
                                                        className="w-full bg-transparent border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-200 outline-none focus:border-primary-500 appearance-none cursor-pointer hover:bg-primary-700/20 transition-colors"
                                                    >
                                                        <option value="short" className="bg-primary-900">Resposta Curta</option>
                                                        <option value="long" className="bg-primary-900">Parágrafo</option>
                                                        <option value="single" className="bg-primary-900">Múltipla Escolha</option>
                                                        <option value="multi" className="bg-primary-900">Caixas de Seleção</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                                </div>
                                            </div>

                                            <input 
                                                value={q.descricao}
                                                onChange={(e) => updateQuestion(q.id, { descricao: e.target.value })}
                                                placeholder="Descrição auxiliar (opcional)"
                                                className="text-[13px] bg-transparent border-none p-0 text-gray-400 placeholder-gray-600 focus:ring-0 w-full"
                                            />

                                            {(q.tipo === "single" || q.tipo === "multi") && (
                                                <div className="mt-2 flex flex-col gap-2 pl-1">
                                                    {q.opcoes.map((op, opIdx) => (
                                                        <div key={opIdx} className="flex items-center gap-3 group/opt">
                                                            {q.tipo === "single" 
                                                                ? <div className="w-4 h-4 rounded-full border border-primary-600 shrink-0" />
                                                                : <div className="w-4 h-4 rounded-sm border border-primary-600 shrink-0" />
                                                            }
                                                            <input 
                                                                value={op}
                                                                onChange={(e) => updateOpcao(q.id, opIdx, e.target.value)}
                                                                placeholder={`Opção ${opIdx + 1}`}
                                                                className="flex-1 bg-transparent border-b border-transparent hover:border-primary-700 focus:border-primary-500 text-[14px] text-gray-200 py-1 outline-none transition-colors"
                                                            />
                                                            <button 
                                                                onClick={() => removeOpcao(q.id, opIdx)}
                                                                className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-rose-400 hover:bg-rose-900/20 rounded-lg transition-all"
                                                                title="Remover opção"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => addOpcao(q.id)}
                                                        className="mt-2 w-fit flex items-center gap-2 text-[13px] font-medium text-primary-400 hover:text-primary-300 px-2 py-1 -ml-2 rounded-lg hover:bg-primary-800/50 transition-colors"
                                                    >
                                                        <Plus size={16} /> Adicionar Opção
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-2 border-t border-primary-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                             <button 
                                                onClick={() => handleDuplicateQuestion(q.id)}
                                                className="p-2 text-gray-400 hover:text-primary-200 hover:bg-primary-800 rounded-lg transition-colors"
                                                title="Duplicar pergunta"
                                             >
                                                <Copy size={18} />
                                             </button>
                                             <button 
                                                onClick={() => handleRemoveQuestion(q.id)}
                                                className="p-2 text-gray-400 hover:text-rose-300 hover:bg-rose-900/20 rounded-lg transition-colors"
                                                title="Excluir pergunta"
                                             >
                                                <Trash2 size={18} />
                                             </button>
                                             <div className="w-px h-4 bg-gray-700 mx-1" />
                                              <div className="flex items-center gap-1">
                                                 <button 
                                                    onClick={() => handleMoveUp(q.id)}
                                                    className="p-2 text-gray-500 hover:text-gray-300 hover:bg-primary-800 rounded-lg"
                                                    title="Mover para cima"
                                                >
                                                    <ChevronUp size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleMoveDown(q.id)}
                                                    className="p-2 text-gray-500 hover:text-gray-300 hover:bg-primary-800 rounded-lg"
                                                    title="Mover para baixo"
                                                >
                                                    <ChevronDown size={18} />
                                                </button>
                                              </div>
                                        </div>

                                        <div className="flex items-center gap-3 pl-4 border-l border-primary-700">
                                            <label className="text-[13px] text-gray-300 cursor-pointer select-none" htmlFor={`req-${q.id}`}>Obrigatória</label>
                                            <button
                                                id={`req-${q.id}`}
                                                type="button"
                                                onClick={() => updateQuestion(q.id, { obrigatorio: !q.obrigatorio })}
                                                className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors duration-200 ${
                                                    q.obrigatorio ? "bg-primary-500" : "bg-primary-700"
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                                                    q.obrigatorio ? "translate-x-4" : "translate-x-0"
                                                }`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddQuestion}
                        className="w-full py-4 border-2 border-dashed border-primary-700 hover:border-primary-500 rounded-2xl text-gray-400 hover:text-primary-300 hover:bg-primary-800/30 transition-all flex items-center justify-center gap-2 group"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-800 group-hover:bg-primary-600 flex items-center justify-center text-gray-300 group-hover:text-white transition-colors">
                            <Plus size={18} />
                        </div>
                        <span className="font-medium">Adicionar nova pergunta</span>
                    </button>

                </div>
            </main>
        </div>
      </div>
      
      <style jsx global>{`
        .novo-briefing-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .novo-briefing-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .novo-briefing-scroll::-webkit-scrollbar-thumb {
          background: var(--primary-700);
          border-radius: 99px;
        }
        .novo-briefing-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--primary-600);
        }
        .animate-fade-in-down {
            animation: fadeInDown 0.2s ease-out forwards;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}