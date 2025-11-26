"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Template1, { DEFAULT_CONTENT, ProposalContent } from "@/components/proposals/Template1";
import CreateClienteModal from "@/components/modals/CreateClientModal";
import Toast, { ToastType } from "@/components/Toast";
import HeaderProfile from "@/components/HeaderProfile";

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

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  const [description, setDescription] = useState("");

  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [techDropdownOpen, setTechDropdownOpen] = useState(false);

  const [content, setContent] = useState<ProposalContent>(DEFAULT_CONTENT);

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
    <div className="min-h-screen w-full bg-primary-900 flex gap-6 overflow-hidden text-gray-100">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
      
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col flex-1 min-w-0 gap-6 pr-6 py-8">
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
            <div className="w-full md:w-64 h-36 rounded-xl bg-primary-800 border border-primary-700 overflow-hidden relative flex items-center justify-center">
              {coverPreviewUrl ? (
                <img
                  src={coverPreviewUrl}
                  alt="Capa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm text-gray-400">Capa da listagem</span>
              )}

              <label className="absolute bottom-3 right-3 bg-black/60 px-3 py-1 text-xs rounded-full cursor-pointer flex items-center gap-1">
                <span>📷</span> Alterar
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCoverFile(file);
                    setCoverPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs text-gray-300">Nome da proposta</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Redesign do site"
                className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1 relative z-30">
              <span className="text-xs text-gray-300">Cliente</span>
              <button
                onClick={() => {
                  setClientsOpen((prev) => !prev);
                  setTechDropdownOpen(false);
                  setStatusOpen(false);
                }}
                className="w-full bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-left"
              >
                {clientId ? clientName : "Selecionar cliente"}
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

            <div className="flex flex-col gap-1 relative z-20">
              <span className="text-xs text-gray-300">Status *</span>

              <button
                onClick={() => {
                  setStatusOpen((prev) => !prev);
                  setClientsOpen(false);
                  setTechDropdownOpen(false);
                }}
                className="w-full bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-left flex justify-between items-center"
              >
                {status ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: STATUS_OPTIONS.find(s => s.value === status)?.color }}
                    />
                    {STATUS_OPTIONS.find(s => s.value === status)?.label}
                  </span>
                ) : (
                  "Selecionar"
                )}

                <span className="text-gray-400">⌄</span>
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

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-300">Valor base</span>
            <input
              type="text"
              placeholder="R$ 0,00"
              value={valueMasked}
              onChange={(e) => handleMoneyChange(e.target.value)}
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3"
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
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-300">Vencimento</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 w-full"
              />
            </div>

            <div className="flex flex-col gap-1 relative z-10">
              <span className="text-xs text-gray-300">
                Tecnologias / ferramentas
              </span>

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

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-300">Descrição</span>
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
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 h-28 resize-none"
            />
          </div>
        </div>

        <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Aparência</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="flex flex-col gap-2 bg-primary-900 border border-primary-700 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-300">Cor do layout</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-9 rounded-lg cursor-pointer bg-transparent border border-primary-600"
              />
            </div>

            <div className="flex flex-col gap-2 bg-primary-900 border border-primary-700 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-300">Logo da empresa</span>
              <label className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 cursor-pointer text-xs flex items-center justify-between">
                <span className="truncate">
                  {logoFile ? logoFile.name : "Selecionar arquivo"}
                </span>
                <span className="bg-primary-600 px-3 py-1 rounded-full">
                  Escolher
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                    setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 bg-primary-900 border border-primary-700 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-300">Banner interno</span>
              <label className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 cursor-pointer text-xs flex items-center justify-between">
                <span className="truncate">
                  {bannerFile ? bannerFile.name : "Selecionar arquivo"}
                </span>
                <span className="bg-primary-600 px-3 py-1 rounded-full">
                  Escolher
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setBannerFile(file);
                    setBannerPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center max-w-full">
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
    </div>
  );
}