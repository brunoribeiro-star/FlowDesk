"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Template1, { DEFAULT_CONTENT, ProposalContent } from "@/components/proposals/Template1";
import Template2 from "@/components/proposals/Template2";
import Template3 from "@/components/proposals/Template3";
import CreateClienteModal from "@/components/modals/CreateClientModal";
import Toast, { ToastType } from "@/components/Toast";
import HeaderProfile from "@/components/HeaderProfile";
import DatePicker from "@/components/DatePicker";
import { validateImageFile } from "@/lib/utils";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import ColorPicker from "@/components/ui/ColorPicker";
import { User, Briefcase, DollarSign, Calendar, Wrench, AlignLeft, Palette, Image as ImageIcon, ChevronDown } from "lucide-react";

type Client = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  cpf_cnpj: string | null;
  foto_url: string | null;
};

const TECH_OPTIONS = [
  "Figma",
  "Photoshop",
  "Illustrator",
  "Canva",
  "Framer",
  "WordPress",
  "Elementor",
  "Shopify",
  "Nuvemshop",
  "Webflow",
];

const STATUS_OPTIONS = [
  { label: "Analisando", value: "analisando", color: "#b38b58" },
  { label: "Negociando", value: "negociando", color: "#4b6fa3" },
  { label: "Aceita", value: "aceita", color: "#6ea28e" },
  { label: "Recusada", value: "recusada", color: "#a64545" },
  { label: "Em espera", value: "em_espera", color: "#6d55a4" },
];

export default function NovaProposta() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");

  const [statusOpen, setStatusOpen] = useState(false);
  const [status, setStatus] = useState<string>("analisando");

  const [valueMasked, setValueMasked] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [valueDiscount, setValueDiscount] = useState<number | null>(null);
  const [value12x, setValue12x] = useState<number | null>(null);

  const [dueDate, setDueDate] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [secondaryColor] = useState("#0f172a");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [dragOver, setDragOver] = useState<"cover" | "banner" | "logo" | null>(null);

  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  const [description, setDescription] = useState("");

  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [techDropdownOpen, setTechDropdownOpen] = useState(false);

  const [content, setContent] = useState<ProposalContent>(DEFAULT_CONTENT);
  const [selectedTemplate, setSelectedTemplate] = useState<"template1" | "template2" | "template3">("template1");

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, empresa, email, telefone, cpf_cnpj, foto_url")
        .order("nome", { ascending: true });

      if (!error && data) setClients(data);
    }
    loadClients();
  }, []);

  const todayDateStr = new Date().toLocaleDateString("pt-BR");

  function maskMoney(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function moneyToNumber(masked: string) {
    const clean = masked.replace(/[R$\s.]/g, "").replace(",", ".");
    const num = Number(clean);
    return Number.isNaN(num) ? 0 : num;
  }

  function handleMoneyChange(v: string) {
    const masked = maskMoney(v);
    setValueMasked(masked);

    if (!masked) {
      setValue(null);
      setValueDiscount(null);
      setValue12x(null);
      return;
    }

    const num = moneyToNumber(masked);
    setValue(num);
    setValueDiscount(num * 0.9);
    setValue12x(num / 12);
  }

  function addTech(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedTechs.includes(trimmed)) return;
    setSelectedTechs((prev) => [...prev, trimmed]);
  }

  function removeTech(name: string) {
    setSelectedTechs((prev) => prev.filter((t) => t !== name));
  }

  function handleFileForZone(
    zone: "cover" | "banner" | "logo",
    file: File | undefined | null
  ) {
    if (!file) return;
    if (zone === "cover") {
      triggerConverter(file, IMAGE_SPECS.thumbnail, (f) => {
        setCoverFile(f);
        setCoverPreviewUrl(URL.createObjectURL(f));
      });
    } else if (zone === "banner") {
      triggerConverter(file, IMAGE_SPECS.hero, (f) => {
        setBannerFile(f);
        setBannerPreviewUrl(URL.createObjectURL(f));
      });
    } else if (zone === "logo") {
      triggerConverter(file, IMAGE_SPECS.logo, (f) => {
        setLogoFile(f);
        setLogoPreviewUrl(URL.createObjectURL(f));
      });
    }
  }

  function handleTechKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!techInput.trim()) return;
      addTech(techInput);
      setTechInput("");
      setTechDropdownOpen(false);
    }
  }

  const filteredTechOptions = TECH_OPTIONS.filter(
    (t) =>
      t.toLowerCase().includes(techInput.toLowerCase()) &&
      !selectedTechs.includes(t)
  );

  async function uploadTo(bucket: string, folder: string, file: File | null) {
    if (!file) return null;

    const ext = file.name.split(".").pop() || "png";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}-${Date.now()}-${sanitizedName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(`${folder}/${fileName}`, file);

    if (error) {
      console.error(`Erro upload ${bucket}/${folder}:`, error);
      return null;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${folder}/${fileName}`);
    return data.publicUrl;
  }

  async function criarProposta() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    const coverUrl = await uploadTo("avatars", "proposals/covers", coverFile);
    const bannerUrl = await uploadTo("avatars", "proposals/banners", bannerFile);
    const logoUrl = await uploadTo("avatars", "proposals/logos", logoFile);

    const { data, error } = await supabase
      .from("proposals")
      .insert([
        {
          user_id: auth.user.id,
          client_id: clientId,
          title: projectName,
          status: status,
          due_date: dueDate || null,
          value,
          value_discount: valueDiscount,
          value_12x: value12x,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          cover_url: coverUrl,
          banner_url: bannerUrl,
          company_logo_url: logoUrl,
          description: {
            projectName,
            clientName,
            description,
            technologies: selectedTechs,
            content,
            template: selectedTemplate,
          },
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar proposta:", error);
      showToast(`Erro ao salvar proposta: ${error.message}`, "error");
      return;
    }

    router.push(`/dashboard/propostas/${data.id}?success=true`);
  }

  return (
    <div className="h-screen w-screen bg-primary-900 flex gap-6 overflow-hidden text-gray-100">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col flex-1 min-w-0 gap-6 pr-6 py-8 overflow-y-auto">
        <header className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/propostas")}
            className="px-4 py-2 border border-primary-700 rounded-lg text-gray-300 hover:bg-primary-800"
          >
            Voltar
          </button>

          <h1 className="text-[32px] font-semibold">Nova Proposta</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={criarProposta}
              disabled={!projectName || !clientId}
              className="bg-primary-500 hover:bg-primary-400 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-40 transition-colors"
            >
              Salvar proposta
            </button>
            <HeaderProfile />
          </div>
        </header>

        <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-6 flex flex-col gap-6">
          <h2 className="text-xl font-semibold mb-1">Detalhes da proposta</h2>

          <div className="flex flex-col md:flex-row gap-6">
            <div
              className={`w-full md:w-64 h-36 rounded-xl border-2 overflow-hidden relative flex items-center justify-center transition-colors cursor-pointer ${
                dragOver === "cover"
                  ? "border-primary-500 bg-primary-700"
                  : "bg-primary-800 border-primary-700 hover:border-primary-600"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver("cover"); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                handleFileForZone("cover", e.dataTransfer.files?.[0]);
              }}
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.items)
                  .find((i) => i.type.startsWith("image/"))
                  ?.getAsFile();
                handleFileForZone("cover", file);
              }}
              tabIndex={0}
              onClick={() => document.getElementById("cover-file-input")?.click()}
            >
              {coverPreviewUrl ? (
                <img
                  src={coverPreviewUrl}
                  alt="Capa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-center px-3">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs text-gray-400">
                    {dragOver === "cover" ? "Solte aqui" : "Capa da listagem"}
                  </span>
                  <span className="text-[10px] text-gray-600">{IMAGE_SPECS.thumbnail.hint}</span>
                </div>
              )}
              <label
                className="absolute bottom-3 right-3 bg-black/60 px-3 py-1 text-xs rounded-full cursor-pointer flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span>📷</span> Alterar
                <input
                  id="cover-file-input"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleFileForZone("cover", file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <Briefcase size={13} className="text-primary-400" />
                Nome da proposta
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Redesign do site"
                className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5 relative z-30">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <User size={13} className="text-primary-400" />
                Cliente
              </label>
              <button
                onClick={() => {
                  setClientsOpen((prev) => !prev);
                  setTechDropdownOpen(false);
                  setStatusOpen(false);
                }}
                className="w-full bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-left flex items-center justify-between text-gray-100 hover:border-primary-600 focus:outline-none focus:border-primary-500 transition-colors"
              >
                <span className={clientId ? "text-gray-100" : "text-gray-500"}>{clientId ? clientName : "Selecionar cliente"}</span>
                <ChevronDown size={15} className="text-gray-400 shrink-0" />
              </button>

              {clientsOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-primary-900 border border-primary-700 rounded-xl max-h-64 overflow-y-auto z-50">
                  <button
                    className="px-4 py-3 w-full text-left text-sm hover:bg-primary-800 flex items-center gap-2"
                    onClick={() => {
                      setClientsOpen(false);
                      setShowCreateClientModal(true);
                    }}
                  >
                    + Novo cliente
                  </button>

                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClientId(c.id);
                        setClientName(c.nome);
                        setClientsOpen(false);
                      }}
                      className="px-4 py-3 w-full text-left text-sm hover:bg-primary-800"
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 relative z-20">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                Status
              </label>

              <button
                onClick={() => {
                  setStatusOpen((prev) => !prev);
                  setClientsOpen(false);
                  setTechDropdownOpen(false);
                }}
                className="w-full bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-left flex justify-between items-center hover:border-primary-600 focus:outline-none focus:border-primary-500 transition-colors"
              >
                {status ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_OPTIONS.find(s => s.value === status)?.color }}
                    />
                    <span className="text-gray-100">{STATUS_OPTIONS.find(s => s.value === status)?.label}</span>
                  </span>
                ) : (
                  <span className="text-gray-500">Selecionar</span>
                )}

                <ChevronDown size={15} className="text-gray-400 shrink-0" />
              </button>

              {statusOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-primary-900 border border-primary-700 rounded-xl overflow-hidden shadow-xl z-50">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setStatus(opt.value);
                        setStatusOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-primary-800 flex items-center gap-3 text-sm"
                    >
                      <span
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
              <DollarSign size={13} className="text-primary-400" />
              Valor base
            </label>
            <input
              type="text"
              placeholder="R$ 0,00"
              value={valueMasked}
              onChange={(e) => handleMoneyChange(e.target.value)}
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
            {value !== null && (
              <span className="text-[11px] text-gray-400 mt-1">
                À vista:{" "}
                {valueDiscount?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                · 12x:{" "}
                {value12x?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <Calendar size={13} className="text-primary-400" />
                Vencimento
              </label>
              <DatePicker
                value={dueDate}
                onChange={(v) => setDueDate(v)}
                placeholder="dd/mm/aaaa"
              />
            </div>

            <div className="flex flex-col gap-1.5 relative z-10">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <Wrench size={13} className="text-primary-400" />
                Tecnologias / ferramentas
              </label>

              <div className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-h-[44px]">
                {selectedTechs.length === 0 && !techInput && (
                  <span className="text-[11px] text-gray-500">
                    Selecione a(s) tecnologias
                  </span>
                )}

                {selectedTechs.map((tech) => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => removeTech(tech)}
                    className="flex items-center gap-1 bg-primary-700 rounded-full px-2 py-1 text-[11px] text-gray-100 hover:bg-primary-600"
                  >
                    <span className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center text-[9px] uppercase">
                      {tech[0]}
                    </span>
                    <span>{tech}</span>
                    <span className="text-[10px] text-gray-300">×</span>
                  </button>
                ))}

                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => {
                    setTechInput(e.target.value);
                    setTechDropdownOpen(true);
                    setClientsOpen(false);
                    setStatusOpen(false);
                  }}
                  onKeyDown={handleTechKeyDown}
                  onFocus={() => {
                    setTechDropdownOpen(true);
                    setClientsOpen(false);
                    setStatusOpen(false);
                  }}
                  placeholder=""
                  className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-500 min-w-[80px]"
                />
              </div>

              {techDropdownOpen && filteredTechOptions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-primary-900 border border-primary-700 rounded-xl max-h-40 overflow-y-auto z-40">
                  {filteredTechOptions.map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => {
                        addTech(tech);
                        setTechInput("");
                        setTechDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-primary-800 flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary-700 flex items-center justify-center text-[10px] uppercase">
                        {tech[0]}
                      </span>
                      {tech}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
              <AlignLeft size={13} className="text-primary-400" />
              Descrição
            </label>
            <textarea
              value={content.section5.description}
              onChange={(e) => {
                const newDesc = e.target.value;
                setDescription(newDesc);
                setContent((prev) => ({
                  ...prev,
                  section5: {
                    ...prev.section5,
                    description: newDesc,
                  },
                }));
              }}
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 h-28 resize-none text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Aparência</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="flex flex-col gap-2 bg-primary-900 border border-primary-700 rounded-xl px-4 py-3">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <Palette size={13} className="text-primary-400" />
                Cor do layout
              </label>
              <ColorPicker value={primaryColor} onChange={setPrimaryColor} />
            </div>

            <div
              className={`flex flex-col gap-2 bg-primary-900 border-2 rounded-xl px-4 py-3 transition-colors cursor-pointer relative ${
                dragOver === "logo"
                  ? "border-primary-500 bg-primary-800"
                  : "border-primary-700 hover:border-primary-600"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver("logo"); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                handleFileForZone("logo", e.dataTransfer.files?.[0]);
              }}
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.items)
                  .find((i) => i.type.startsWith("image/"))
                  ?.getAsFile();
                handleFileForZone("logo", file);
              }}
              tabIndex={0}
              onClick={() => document.getElementById("logo-file-input")?.click()}
            >
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <ImageIcon size={13} className="text-primary-400" />
                Logo da empresa
              </label>
              <div className="flex items-center gap-3 min-h-[36px]">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo" className="h-8 object-contain rounded" />
                ) : (
                  <span className="text-[11px] text-gray-500">
                    {dragOver === "logo" ? "Solte a imagem aqui" : "Arraste, cole ou clique para escolher"}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600">{IMAGE_SPECS.logo.hint}</span>
              <input
                id="logo-file-input"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleFileForZone("logo", file);
                  e.target.value = "";
                }}
              />
            </div>

            <div
              className={`flex flex-col gap-2 bg-primary-900 border-2 rounded-xl px-4 py-3 transition-colors cursor-pointer relative ${
                dragOver === "banner"
                  ? "border-primary-500 bg-primary-800"
                  : "border-primary-700 hover:border-primary-600"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver("banner"); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                handleFileForZone("banner", e.dataTransfer.files?.[0]);
              }}
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.items)
                  .find((i) => i.type.startsWith("image/"))
                  ?.getAsFile();
                handleFileForZone("banner", file);
              }}
              tabIndex={0}
              onClick={() => document.getElementById("banner-file-input")?.click()}
            >
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-300">
                <ImageIcon size={13} className="text-primary-400" />
                Banner interno
              </label>
              <div className="flex items-center gap-3 min-h-[36px]">
                {bannerPreviewUrl ? (
                  <img src={bannerPreviewUrl} alt="Banner" className="h-8 object-contain rounded" />
                ) : (
                  <span className="text-[11px] text-gray-500">
                    {dragOver === "banner" ? "Solte a imagem aqui" : "Arraste, cole ou clique para escolher"}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600">{IMAGE_SPECS.hero.hint}</span>
              <input
                id="banner-file-input"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleFileForZone("banner", file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Modelo de proposta</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              {
                id: "template1",
                name: "Clássico",
                description: "Layout clean em fundo branco com cartões e seções bem definidas.",
                preview: (
                  <div className="w-full h-full bg-white rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="h-5 rounded" style={{ backgroundColor: primaryColor }} />
                    <div className="h-2 w-3/4 bg-slate-200 rounded-full" />
                    <div className="h-2 w-1/2 bg-slate-200 rounded-full" />
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div className="h-8 bg-slate-100 rounded border border-slate-200" />
                      <div className="h-8 bg-slate-100 rounded border border-slate-200" />
                    </div>
                  </div>
                ),
              },
              {
                id: "template2",
                name: "Dark Premium",
                description: "Visual escuro e moderno, ideal para projetos tech e criação digital.",
                preview: (
                  <div className="w-full h-full bg-[#0d1117] rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="h-5 rounded" style={{ backgroundColor: primaryColor }} />
                    <div className="h-2 w-3/4 bg-[#30363d] rounded-full" />
                    <div className="h-2 w-1/2 bg-[#30363d] rounded-full" />
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div className="h-8 bg-[#161b22] rounded border border-[#30363d]" />
                      <div className="h-8 bg-[#161b22] rounded border border-[#30363d]" />
                    </div>
                  </div>
                ),
              },
              {
                id: "template3",
                name: "Editorial",
                description: "Estilo minimalista com tipografia forte, como uma revista.",
                preview: (
                  <div className="w-full h-full bg-white rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="h-2 w-full bg-gray-100 rounded-full" />
                    <div className="h-6 w-4/5 bg-gray-100 rounded" />
                    <div className="h-[3px] w-full rounded-full mt-0.5" style={{ backgroundColor: primaryColor }} />
                    <div className="h-2 w-2/3 bg-gray-100 rounded-full mt-1" />
                    <div className="flex gap-1.5 mt-1">
                      <div className="h-7 flex-1 bg-gray-50 rounded border border-gray-200" />
                      <div className="h-7 flex-1 bg-gray-50 rounded border border-gray-200" />
                      <div className="h-7 flex-1 bg-gray-50 rounded border border-gray-200" />
                    </div>
                  </div>
                ),
              },
            ] as const).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  selectedTemplate === tpl.id
                    ? "border-primary-500 bg-primary-800"
                    : "border-primary-700 bg-primary-800/50 hover:border-primary-600"
                }`}
              >
                <div className="w-full h-28 rounded-lg overflow-hidden border border-primary-700">
                  {tpl.preview}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-100">{tpl.name}</span>
                  {selectedTemplate === tpl.id && (
                    <span className="text-[11px] bg-primary-500 text-white px-2 py-0.5 rounded-full">Selecionado</span>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 leading-relaxed">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center max-w-full">
          {selectedTemplate === "template2" ? (
            <Template2
              projectName={projectName}
              clientName={clientName}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              bannerUrl={bannerPreviewUrl}
              logoUrl={logoPreviewUrl}
              value={value}
              valueDiscount={valueDiscount}
              value12x={value12x}
              dueDate={dueDate ? new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR") : ""}
              date={todayDateStr}
              editable={true}
              technologies={selectedTechs}
              content={content}
              onContentChange={setContent}
            />
          ) : selectedTemplate === "template3" ? (
            <Template3
              projectName={projectName}
              clientName={clientName}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              bannerUrl={bannerPreviewUrl}
              logoUrl={logoPreviewUrl}
              value={value}
              valueDiscount={valueDiscount}
              value12x={value12x}
              dueDate={dueDate ? new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR") : ""}
              date={todayDateStr}
              editable={true}
              technologies={selectedTechs}
              content={content}
              onContentChange={setContent}
            />
          ) : (
            <Template1
              projectName={projectName}
              clientName={clientName}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              bannerUrl={bannerPreviewUrl}
              logoUrl={logoPreviewUrl}
              value={value}
              valueDiscount={valueDiscount}
              value12x={value12x}
              dueDate={
                dueDate
                  ? new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR")
                  : ""
              }
              date={todayDateStr}
              editable={true}
              technologies={selectedTechs}
              content={content}
              onContentChange={setContent}
            />
          )}
        </div>
      </div>

      {showCreateClientModal && (
        <CreateClienteModal
          open={showCreateClientModal}
          onClose={() => setShowCreateClientModal(false)}
          onComplete={(newClient) => {
            setClients((prev) => [...prev, newClient]);
            setClientId(newClient.id);
            setClientName(newClient.nome);
            setShowCreateClientModal(false);
            setClientsOpen(false);
          }}
        />
      )}
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