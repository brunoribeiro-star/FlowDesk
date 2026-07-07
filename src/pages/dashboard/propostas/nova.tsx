"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
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
import {
  ArrowLeft,
  Check,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  Wrench,
  AlignLeft,
  Palette,
  Image as ImageIcon,
  ChevronDown,
  X,
} from "lucide-react";

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
  "Figma", "Photoshop", "Illustrator", "Canva", "Framer",
  "WordPress", "Elementor", "Shopify", "Nuvemshop", "Webflow",
];

const STATUS_OPTIONS = [
  { label: "Analisando", value: "analisando", tone: "primary" },
  { label: "Negociando", value: "negociando", tone: "alert"   },
  { label: "Aceita",     value: "aceita",     tone: "success"  },
  { label: "Recusada",   value: "recusada",   tone: "error"    },
  { label: "Em espera",  value: "em_espera",  tone: "neutral"  },
];

export default function NovaProposta() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const [projectName, setProjectName]     = useState("");
  const [clientId, setClientId]           = useState<string | null>(null);
  const [clientName, setClientName]       = useState("");

  const [statusOpen, setStatusOpen]       = useState(false);
  const [status, setStatus]               = useState<string>("analisando");

  const [valueMasked, setValueMasked]     = useState("");
  const [value, setValue]                 = useState<number | null>(null);
  const [valueDiscount, setValueDiscount] = useState<number | null>(null);
  const [value12x, setValue12x]           = useState<number | null>(null);

  const [dueDate, setDueDate]             = useState("");
  const [primaryColor, setPrimaryColor]   = useState("#22c55e");
  const [secondaryColor]                  = useState("#0f172a");

  const [coverFile, setCoverFile]             = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [bannerFile, setBannerFile]             = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const [logoFile, setLogoFile]             = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [dragOver, setDragOver] = useState<"cover" | "banner" | "logo" | null>(null);

  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [clients, setClients]                       = useState<Client[]>([]);
  const [clientsOpen, setClientsOpen]               = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  const [description, setDescription]               = useState("");
  const [selectedTechs, setSelectedTechs]           = useState<string[]>([]);
  const [techInput, setTechInput]                   = useState("");
  const [techDropdownOpen, setTechDropdownOpen]     = useState(false);

  const [content, setContent]                       = useState<ProposalContent>(DEFAULT_CONTENT);
  const [selectedTemplate, setSelectedTemplate]     = useState<"template1" | "template2" | "template3">("template1");

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

  function maskMoney(v: string) {
    const digits = v.replace(/\D/g, "");
    if (!digits) return "";
    return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function moneyToNumber(masked: string) {
    const clean = masked.replace(/[R$\s.]/g, "").replace(",", ".");
    const num = Number(clean);
    return Number.isNaN(num) ? 0 : num;
  }

  function handleMoneyChange(v: string) {
    const masked = maskMoney(v);
    setValueMasked(masked);
    if (!masked) { setValue(null); setValueDiscount(null); setValue12x(null); return; }
    const num = moneyToNumber(masked);
    setValue(num);
    setValueDiscount(num * 0.9);
    setValue12x(num / 12);
  }

  function addTech(name: string) {
    const t = name.trim();
    if (!t || selectedTechs.includes(t)) return;
    setSelectedTechs((p) => [...p, t]);
  }

  function removeTech(name: string) {
    setSelectedTechs((p) => p.filter((t) => t !== name));
  }

  function handleFileForZone(zone: "cover" | "banner" | "logo", file: File | undefined | null) {
    if (!file) return;
    if (zone === "cover") {
      triggerConverter(file, IMAGE_SPECS.thumbnail, (f) => { setCoverFile(f); setCoverPreviewUrl(URL.createObjectURL(f)); });
    } else if (zone === "banner") {
      triggerConverter(file, IMAGE_SPECS.hero, (f) => { setBannerFile(f); setBannerPreviewUrl(URL.createObjectURL(f)); });
    } else if (zone === "logo") {
      triggerConverter(file, IMAGE_SPECS.logo, (f) => { setLogoFile(f); setLogoPreviewUrl(URL.createObjectURL(f)); });
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
    (t) => t.toLowerCase().includes(techInput.toLowerCase()) && !selectedTechs.includes(t)
  );

  async function uploadTo(bucket: string, folder: string, file: File | null) {
    if (!file) return null;
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}-${Date.now()}-${sanitizedName}`;
    const { error } = await supabase.storage.from(bucket).upload(`${folder}/${fileName}`, file);
    if (error) { console.error(`Erro upload ${bucket}/${folder}:`, error); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(`${folder}/${fileName}`);
    return data.publicUrl;
  }

  async function criarProposta() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    const coverUrl  = await uploadTo("avatars", "proposals/covers",  coverFile);
    const bannerUrl = await uploadTo("avatars", "proposals/banners", bannerFile);
    const logoUrl   = await uploadTo("avatars", "proposals/logos",   logoFile);

    const { data, error } = await supabase
      .from("proposals")
      .insert([{
        user_id: auth.user.id,
        client_id: clientId,
        title: projectName,
        status,
        due_date: dueDate || null,
        value,
        value_discount: valueDiscount,
        value_12x: value12x,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        cover_url: coverUrl,
        banner_url: bannerUrl,
        company_logo_url: logoUrl,
        description: { projectName, clientName, description, technologies: selectedTechs, content, template: selectedTemplate },
      }])
      .select("id")
      .single();

    if (error) { console.error("Erro ao criar proposta:", error); showToast(`Erro ao salvar proposta: ${error.message}`, "error"); return; }
    router.push(`/dashboard/propostas/${data.id}?success=true`);
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);

  const sharedPreviewProps = {
    projectName, clientName, primaryColor, secondaryColor,
    bannerUrl: bannerPreviewUrl, logoUrl: logoPreviewUrl,
    value, valueDiscount, value12x,
    dueDate: dueDate ? new Date(dueDate + "T00:00:00").toLocaleDateString("pt-BR") : "",
    date: todayDateStr,
    editable: true,
    technologies: selectedTechs,
    content,
    onContentChange: setContent,
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="pn-page relative flex flex-col flex-1 h-full overflow-hidden">
        <div className="pn-glow pn-glow-a" />

        <header className="pn-top relative z-30 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <button type="button" className="pn-back-btn" onClick={() => router.push("/dashboard/propostas")}>
              <ArrowLeft size={18} />
              <span>Voltar</span>
            </button>
            <div className="lg:hidden">
              <HeaderProfile />
            </div>
          </div>

          <span className="pn-title">Nova Proposta</span>

          <div className="flex items-center gap-3 lg:ml-auto">
            <button
              type="button"
              className="pn-save-btn flex-1 lg:flex-none justify-center"
              onClick={criarProposta}
              disabled={!projectName || !clientId}
            >
              Salvar proposta
            </button>
            <div className="hidden lg:block">
              <HeaderProfile />
            </div>
          </div>
        </header>

        <div className="pn-body">

          <section className="pn-card">
            <h2 className="pn-card-title">Detalhes da proposta</h2>

            <div className="pn-detail-top">
              <div
                className={`pn-upload${dragOver === "cover" ? " is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver("cover"); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); handleFileForZone("cover", e.dataTransfer.files?.[0]); }}
                onPaste={(e) => { const f = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"))?.getAsFile(); handleFileForZone("cover", f); }}
                tabIndex={0}
                onClick={() => document.getElementById("cover-file-input")?.click()}
              >
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Capa" className="pn-upload-preview" />
                ) : (
                  <>
                    <span className="pn-upload-ic"><ImageIcon size={22} /></span>
                    <span className="pn-upload-title">Capa da listagem</span>
                    <span className="pn-upload-hint">{IMAGE_SPECS.thumbnail.hint}</span>
                  </>
                )}
                <label
                  className="pn-upload-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  Alterar
                  <input
                    id="cover-file-input"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; handleFileForZone("cover", f); e.target.value = ""; }}
                  />
                </label>
              </div>

              <div className="pn-detail-fields">
                <label className="pn-field">
                  <span className="pn-field-label"><Briefcase size={15} /> Nome da proposta</span>
                  <input
                    type="text"
                    className="pn-input"
                    placeholder="Ex: Redesign do site"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </label>

                <div className="pn-row2">
                  <div className="pn-field" style={{ position: "relative", zIndex: 30 }}>
                    <span className="pn-field-label"><User size={15} /> Cliente</span>
                    <button
                      type="button"
                      className={`pn-select${!clientId ? " pn-placeholder" : ""}`}
                      onClick={() => { setClientsOpen((p) => !p); setTechDropdownOpen(false); setStatusOpen(false); }}
                    >
                      <span>{clientId ? clientName : "Selecionar cliente"}</span>
                      <ChevronDown size={16} />
                    </button>
                    {clientsOpen && (
                      <div className="pn-dropdown">
                        <button
                          className="pn-dropdown-item"
                          onClick={() => { setClientsOpen(false); setShowCreateClientModal(true); }}
                        >
                          + Novo cliente
                        </button>
                        {clients.map((c) => (
                          <button key={c.id} className="pn-dropdown-item"
                            onClick={() => { setClientId(c.id); setClientName(c.nome); setClientsOpen(false); }}
                          >
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pn-field" style={{ position: "relative", zIndex: 20 }}>
                    <span className="pn-field-label">Status</span>
                    <button
                      type="button"
                      className="pn-select"
                      onClick={() => { setStatusOpen((p) => !p); setClientsOpen(false); setTechDropdownOpen(false); }}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`pn-statusdot tone-${currentStatus?.tone}`} />
                        {currentStatus?.label}
                      </span>
                      <ChevronDown size={16} />
                    </button>
                    {statusOpen && (
                      <div className="pn-dropdown">
                        {STATUS_OPTIONS.map((opt) => (
                          <button key={opt.value} className="pn-dropdown-item"
                            onClick={() => { setStatus(opt.value); setStatusOpen(false); }}
                          >
                            <span className={`pn-statusdot tone-${opt.tone}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pn-row3">
              <label className="pn-field">
                <span className="pn-field-label"><DollarSign size={15} /> Valor base</span>
                <input
                  type="text"
                  className="pn-input"
                  placeholder="R$ 0,00"
                  value={valueMasked}
                  onChange={(e) => handleMoneyChange(e.target.value)}
                />
              </label>

              {/* Vencimento */}
              <div className="pn-field">
                <span className="pn-field-label"><Calendar size={15} /> Vencimento</span>
                <DatePicker
                  value={dueDate}
                  onChange={(v) => setDueDate(v)}
                  placeholder="dd/mm/aaaa"
                  buttonClassName="pn-input pn-datepicker"
                />
              </div>

              <div className="pn-field" style={{ position: "relative", zIndex: 10 }}>
                <span className="pn-field-label"><Wrench size={15} /> Tecnologias / ferramentas</span>
                <div className="pn-tech-wrap">
                  {selectedTechs.map((tech) => (
                    <button key={tech} type="button" className="pn-tag" onClick={() => removeTech(tech)}>
                      {tech} <X size={11} />
                    </button>
                  ))}
                  <input
                    type="text"
                    className="pn-tech-input"
                    value={techInput}
                    placeholder={selectedTechs.length === 0 ? "Selecione a(s) tecnologias" : ""}
                    onChange={(e) => { setTechInput(e.target.value); setTechDropdownOpen(true); setClientsOpen(false); setStatusOpen(false); }}
                    onKeyDown={handleTechKeyDown}
                    onFocus={() => { setTechDropdownOpen(true); setClientsOpen(false); setStatusOpen(false); }}
                  />
                </div>
                {techDropdownOpen && filteredTechOptions.length > 0 && (
                  <div className="pn-dropdown">
                    {filteredTechOptions.map((tech) => (
                      <button key={tech} type="button" className="pn-dropdown-item"
                        onClick={() => { addTech(tech); setTechInput(""); setTechDropdownOpen(false); }}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {value !== null && (
              <p className="pn-value-hint">
                À vista: {valueDiscount?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                {" · "}
                12×: {value12x?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}

            <label className="pn-field" style={{ marginTop: "20px" }}>
              <span className="pn-field-label"><AlignLeft size={15} /> Descrição</span>
              <textarea
                className="pn-textarea"
                value={content.section5.description}
                onChange={(e) => {
                  const newDesc = e.target.value;
                  setDescription(newDesc);
                  setContent((prev) => ({ ...prev, section5: { ...prev.section5, description: newDesc } }));
                }}
              />
            </label>
          </section>

          <section className="pn-card">
            <h2 className="pn-card-title">Aparência</h2>
            <div className="pn-appear-grid">

              <div className="pn-appear-cell">
                <span className="pn-field-label"><Palette size={15} /> Cor do layout</span>
                <div className="pn-color-display">
                  <span className="pn-swatch" style={{ background: primaryColor }} />
                  <span className="pn-color-hex">{primaryColor}</span>
                </div>
                <ColorPicker value={primaryColor} onChange={setPrimaryColor} />
              </div>

              <div
                className={`pn-appear-cell pn-dropcell${dragOver === "logo" ? " is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver("logo"); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); handleFileForZone("logo", e.dataTransfer.files?.[0]); }}
                onPaste={(e) => { const f = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"))?.getAsFile(); handleFileForZone("logo", f); }}
                tabIndex={0}
                onClick={() => document.getElementById("logo-file-input")?.click()}
              >
                <span className="pn-field-label"><ImageIcon size={15} /> Logo da empresa</span>
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo" className="h-10 object-contain rounded" />
                ) : (
                  <>
                    <span className="pn-drop-main">{dragOver === "logo" ? "Solte aqui" : "Arraste, cole ou clique"}</span>
                    <span className="pn-drop-hint">{IMAGE_SPECS.logo.hint}</span>
                  </>
                )}
                <input id="logo-file-input" type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; handleFileForZone("logo", f); e.target.value = ""; }}
                />
              </div>

              <div
                className={`pn-appear-cell pn-dropcell${dragOver === "banner" ? " is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver("banner"); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); handleFileForZone("banner", e.dataTransfer.files?.[0]); }}
                onPaste={(e) => { const f = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"))?.getAsFile(); handleFileForZone("banner", f); }}
                tabIndex={0}
                onClick={() => document.getElementById("banner-file-input")?.click()}
              >
                <span className="pn-field-label"><ImageIcon size={15} /> Banner interno</span>
                {bannerPreviewUrl ? (
                  <img src={bannerPreviewUrl} alt="Banner" className="h-10 object-contain rounded" />
                ) : (
                  <>
                    <span className="pn-drop-main">{dragOver === "banner" ? "Solte aqui" : "Arraste, cole ou clique"}</span>
                    <span className="pn-drop-hint">{IMAGE_SPECS.hero.hint}</span>
                  </>
                )}
                <input id="banner-file-input" type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; handleFileForZone("banner", f); e.target.value = ""; }}
                />
              </div>
            </div>
          </section>

          <section className="pn-card">
            <h2 className="pn-card-title">Modelo de proposta</h2>
            <div className="pn-tpl-grid">
              {([
                {
                  id: "template1" as const,
                  name: "Clássico",
                  desc: "Layout clean em fundo branco com cartões e seções bem definidas.",
                  thumb: (
                    <div className="pn-tpl-thumb pn-tpl-light">
                      <span className="pn-tpl-bar" style={{ background: primaryColor }} />
                      <span className="pn-tpl-line pn-tpl-l1" />
                      <span className="pn-tpl-line pn-tpl-l2" />
                      <div className="pn-tpl-blocks"><span /><span /></div>
                    </div>
                  ),
                },
                {
                  id: "template2" as const,
                  name: "Dark Premium",
                  desc: "Visual escuro e moderno, ideal para projetos tech e criação digital.",
                  thumb: (
                    <div className="pn-tpl-thumb pn-tpl-dark">
                      <span className="pn-tpl-bar" style={{ background: primaryColor }} />
                      <span className="pn-tpl-line pn-tpl-l1 pn-tpl-dark-line" />
                      <span className="pn-tpl-line pn-tpl-l2 pn-tpl-dark-line" />
                      <div className="pn-tpl-blocks pn-tpl-dark-blocks"><span /><span /></div>
                    </div>
                  ),
                },
                {
                  id: "template3" as const,
                  name: "Editorial",
                  desc: "Estilo minimalista com tipografia forte, como uma revista.",
                  thumb: (
                    <div className="pn-tpl-thumb pn-tpl-editorial">
                      <span className="pn-tpl-line pn-tpl-l1" style={{ height: "8px" }} />
                      <span className="pn-tpl-line" style={{ height: "20px", width: "80%" }} />
                      <span className="pn-tpl-line" style={{ height: "3px", width: "100%", background: primaryColor, borderRadius: "2px" }} />
                      <div className="pn-tpl-blocks"><span /><span /><span /></div>
                    </div>
                  ),
                },
              ]).map((tpl) => {
                const selected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`pn-tpl${selected ? " is-on" : ""}`}
                    onClick={() => setSelectedTemplate(tpl.id)}
                  >
                    {tpl.thumb}
                    <div className="pn-tpl-head">
                      <span className="pn-tpl-name">{tpl.name}</span>
                      {selected && (
                        <span className="pn-tpl-badge">
                          <Check size={13} /> Selecionado
                        </span>
                      )}
                    </div>
                    <p className="pn-tpl-desc">{tpl.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex justify-center w-full overflow-x-auto">
            {selectedTemplate === "template2" ? (
              <Template2 {...sharedPreviewProps} />
            ) : selectedTemplate === "template3" ? (
              <Template3 {...sharedPreviewProps} />
            ) : (
              <Template1 {...sharedPreviewProps} />
            )}
          </div>
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

      <style jsx global>{`
        /* ── Page wrapper ── */
        .pn-page {
          background: radial-gradient(
            120% 80% at 50% -10%,
            var(--primary-800) 0%,
            var(--primary-900) 55%,
            var(--primary-900) 100%
          );
          -webkit-font-smoothing: antialiased;
        }
        .pn-glow { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; z-index: 0; }
        .pn-glow-a {
          width: 520px; height: 520px; right: -180px; top: -180px;
          background: radial-gradient(circle, rgba(30, 182, 232, 0.12), transparent 70%);
        }

        /* ── Header ── */
        .pn-top {
          position: relative; z-index: 30;
          padding: 18px 40px;
          border-bottom: 1px solid var(--gray-700);
          background: var(--primary-900);
        }
        .pn-title {
          flex: 1; text-align: center;
          font-size: 22px; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
        }
        .pn-back-btn {
          display: flex; align-items: center; gap: 10px;
          height: 46px; padding: 0 20px; border-radius: 13px; flex: none;
          border: 1px solid var(--gray-700); background: var(--primary-800);
          color: var(--gray-200); cursor: pointer; font-family: inherit;
          font-size: 15px; font-weight: 500; transition: 0.2s;
        }
        .pn-back-btn:hover { border-color: var(--primary-500); color: var(--primary-300); }
        .pn-save-btn {
          display: flex; align-items: center; gap: 9px;
          height: 46px; padding: 0 24px;
          font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border: 0; border-radius: 13px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 10px 24px -10px rgba(30, 182, 232, 0.8);
          transition: 0.2s; white-space: nowrap;
        }
        .pn-save-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(30, 182, 232, 0.9); }
        .pn-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Body ── */
        .pn-body {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column; gap: 24px;
          padding: 30px 40px 50px;
          max-width: 1320px; width: 100%; margin: 0 auto;
          position: relative; z-index: 2;
        }
        .pn-body::-webkit-scrollbar { width: 8px; }
        .pn-body::-webkit-scrollbar-track { background: transparent; }
        .pn-body::-webkit-scrollbar-thumb {
          background: var(--primary-600); border-radius: 8px;
          border: 3px solid transparent; background-clip: padding-box;
        }

        /* ── Cards ── */
        .pn-card {
          padding: 28px 32px 32px; border-radius: 22px;
          border: 1px solid var(--gray-700); background: var(--primary-800);
        }
        .pn-card-title {
          margin: 0 0 22px; font-size: 20px; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
        }

        /* ── Layout grids ── */
        .pn-detail-top {
          display: grid; grid-template-columns: 280px 1fr;
          gap: 24px; align-items: stretch;
        }
        .pn-detail-fields { display: flex; flex-direction: column; gap: 18px; justify-content: space-between; }
        .pn-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .pn-row3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 18px; }

        /* ── Fields ── */
        .pn-field { display: flex; flex-direction: column; gap: 9px; }
        .pn-field-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 13.5px; font-weight: 500; color: var(--gray-300);
        }
        .pn-field-label svg { color: var(--primary-400); flex: none; }

        /* ── Inputs ── */
        .pn-input {
          width: 100%; height: 52px; padding: 0 16px; border-radius: 13px;
          border: 1px solid var(--gray-600); background: var(--primary-900);
          color: var(--gray-100); font-family: inherit; font-size: 15px; transition: 0.2s;
          display: flex; align-items: center;
        }
        .pn-input::placeholder { color: var(--gray-500); }
        .pn-input:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(30, 182, 232, 0.12); }
        /* DatePicker override */
        .pn-datepicker {
          width: 100% !important; height: 52px !important; padding: 0 16px !important;
          border-radius: 13px !important; border: 1px solid var(--gray-600) !important;
          background: var(--primary-900) !important; color: var(--gray-100) !important;
          font-size: 15px !important; justify-content: flex-start !important;
        }
        .pn-datepicker:focus { border-color: var(--primary-500) !important; }

        /* ── Select buttons ── */
        .pn-select {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; height: 52px; padding: 0 16px;
          font-family: inherit; font-size: 15px; color: var(--gray-100);
          cursor: pointer; border-radius: 13px;
          border: 1px solid var(--gray-600); background: var(--primary-900); transition: 0.2s;
        }
        .pn-select:hover { border-color: var(--gray-400); }
        .pn-select > svg { color: var(--gray-500); flex: none; }
        .pn-select.pn-placeholder { color: var(--gray-500); }
        .pn-statusdot {
          width: 8px; height: 8px; border-radius: 50%; flex: none; display: inline-block;
        }
        .pn-statusdot.tone-primary { background: var(--primary-400); box-shadow: 0 0 7px var(--primary-500); }
        .pn-statusdot.tone-alert   { background: var(--alert-medium); box-shadow: 0 0 7px var(--alert-medium); }
        .pn-statusdot.tone-success { background: var(--success-medium); box-shadow: 0 0 7px var(--success-medium); }
        .pn-statusdot.tone-error   { background: var(--error-medium); box-shadow: 0 0 7px var(--error-medium); }
        .pn-statusdot.tone-neutral { background: var(--gray-500); }

        /* ── Dropdowns ── */
        .pn-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0; width: 100%;
          background: var(--primary-800); border: 1px solid var(--gray-700);
          border-radius: 14px; max-height: 240px; overflow-y: auto;
          box-shadow: 0 16px 40px -12px rgba(0,0,0,0.4); z-index: 50;
        }
        .pn-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 12px 16px; text-align: left;
          font-family: inherit; font-size: 14px; color: var(--gray-100);
          background: none; border: 0; cursor: pointer; transition: background 0.15s;
        }
        .pn-dropdown-item:hover { background: var(--primary-700); }

        /* ── Tech tag input ── */
        .pn-tech-wrap {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
          min-height: 52px; padding: 8px 14px; border-radius: 13px;
          border: 1px solid var(--gray-600); background: var(--primary-900); transition: 0.2s;
        }
        .pn-tech-wrap:focus-within { border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(30, 182, 232, 0.12); }
        .pn-tag {
          display: flex; align-items: center; gap: 5px;
          background: var(--primary-700); border: 0; border-radius: 999px;
          padding: 4px 10px; font-size: 12.5px; color: var(--gray-100);
          cursor: pointer; transition: background 0.15s;
        }
        .pn-tag:hover { background: var(--primary-600); }
        .pn-tech-input {
          flex: 1; min-width: 80px; background: none; border: 0; outline: none;
          font-family: inherit; font-size: 14px; color: var(--gray-100);
        }
        .pn-tech-input::placeholder { color: var(--gray-500); }

        /* ── Textarea ── */
        .pn-textarea {
          min-height: 130px; padding: 16px; border-radius: 13px; resize: none;
          border: 1px solid var(--gray-600); background: var(--primary-900);
          font-family: inherit; font-size: 15px; color: var(--gray-100); line-height: 1.55; transition: 0.2s;
          width: 100%;
        }
        .pn-textarea:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(30, 182, 232, 0.12); }

        /* ── Cover upload ── */
        .pn-upload {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 7px; cursor: pointer; padding: 20px 16px; border-radius: 16px; text-align: center;
          border: 1.5px dashed var(--gray-600); background: rgba(30, 182, 232, 0.03); transition: 0.2s;
          position: relative; overflow: hidden;
        }
        .pn-upload:hover, .pn-upload.is-over { border-color: var(--primary-500); background: rgba(30, 182, 232, 0.06); }
        .pn-upload-preview { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .pn-upload-ic {
          display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px;
          color: var(--primary-300); background: rgba(30, 182, 232, 0.10);
          border: 1px solid rgba(30, 182, 232, 0.28); margin-bottom: 2px;
        }
        .pn-upload-title { font-size: 14px; font-weight: 600; color: var(--gray-100); }
        .pn-upload-hint { font-size: 11.5px; color: var(--gray-500); line-height: 1.4; max-width: 200px; }
        .pn-upload-btn {
          position: absolute; bottom: 12px; right: 12px; z-index: 2;
          font-size: 12.5px; font-weight: 600; color: var(--primary-300);
          padding: 6px 14px; border-radius: 9px; cursor: pointer;
          border: 1px solid rgba(30, 182, 232, 0.35); background: rgba(30, 182, 232, 0.08);
          transition: 0.2s;
        }
        .pn-upload-btn:hover { background: rgba(30, 182, 232, 0.16); }

        /* ── Value hint ── */
        .pn-value-hint {
          font-size: 12px; color: var(--gray-400); margin-top: 6px;
        }

        /* ── Appearance grid ── */
        .pn-appear-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pn-appear-cell {
          display: flex; flex-direction: column; gap: 12px; padding: 20px 22px;
          border-radius: 16px; border: 1px solid var(--gray-700); background: var(--primary-900);
        }
        .pn-dropcell { cursor: pointer; transition: 0.2s; }
        .pn-dropcell:hover, .pn-dropcell.is-over { border-color: var(--primary-500); background: rgba(30, 182, 232, 0.04); }
        .pn-color-display {
          display: flex; align-items: center; gap: 12px; height: 50px; padding: 0 14px;
          border-radius: 12px; border: 1px solid var(--gray-600); background: var(--primary-800);
        }
        .pn-swatch {
          width: 26px; height: 26px; border-radius: 7px; flex: none;
          border: 1px solid var(--gray-700); box-shadow: 0 0 12px -4px var(--primary-500);
        }
        .pn-color-hex { font-size: 14px; color: var(--gray-200); font-variant-numeric: tabular-nums; }
        .pn-drop-main { font-size: 13.5px; color: var(--gray-300); }
        .pn-drop-hint { font-size: 12px; color: var(--gray-500); }

        /* ── Template cards ── */
        .pn-tpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .pn-tpl {
          display: flex; flex-direction: column; gap: 13px; padding: 16px;
          border-radius: 18px; border: 1px solid var(--gray-700); cursor: pointer;
          background: var(--primary-900); font-family: inherit; text-align: left; transition: 0.2s;
        }
        .pn-tpl:hover { border-color: var(--primary-600); transform: translateY(-2px); }
        .pn-tpl.is-on {
          border-color: var(--primary-500); background: rgba(30, 182, 232, 0.05);
          box-shadow: 0 0 0 1px var(--primary-500), 0 16px 36px -20px rgba(30, 182, 232, 0.5);
        }
        .pn-tpl-thumb {
          display: flex; flex-direction: column; gap: 7px;
          height: 140px; padding: 16px; border-radius: 11px;
        }
        .pn-tpl-light, .pn-tpl-editorial { background: #fff; }
        .pn-tpl-dark { background: #0f1518; }
        .pn-tpl-bar { height: 22px; border-radius: 6px; flex: none; }
        .pn-tpl-line { border-radius: 4px; flex: none; }
        .pn-tpl-l1 { height: 7px; width: 80%; background: #d0d7da; }
        .pn-tpl-l2 { height: 7px; width: 55%; background: #d0d7da; }
        .pn-tpl-dark-line { background: #2b3539 !important; }
        .pn-tpl-blocks { display: flex; gap: 8px; margin-top: auto; }
        .pn-tpl-blocks span { flex: 1; height: 36px; border-radius: 7px; background: #eef2f3; }
        .pn-tpl-dark-blocks span { background: #1b2226 !important; }
        .pn-tpl-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .pn-tpl-name { font-size: 16px; font-weight: 700; color: var(--gray-100); }
        .pn-tpl-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600; color: var(--primary-900);
          padding: 4px 11px; border-radius: 999px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
        }
        .pn-tpl-desc { margin: 0; font-size: 13px; color: var(--gray-400); line-height: 1.5; }

        /* ── Responsivo ── */
        @media (max-width: 1023px) {
          .pn-top { padding: 16px 20px; }
          .pn-body { padding: 20px 16px 40px; gap: 18px; }
          .pn-card { padding: 20px 18px 24px; }
          .pn-detail-top { grid-template-columns: 1fr; }
          .pn-row2 { grid-template-columns: repeat(2, 1fr); }
          .pn-row3 { grid-template-columns: repeat(2, 1fr); }
          .pn-appear-grid { grid-template-columns: repeat(2, 1fr); }
          .pn-tpl-grid { grid-template-columns: repeat(2, 1fr); }
          .pn-title { text-align: left; }
        }
        @media (max-width: 639px) {
          .pn-top { padding: 14px 16px; }
          .pn-body { padding: 16px 14px 36px; }
          .pn-card { padding: 18px 16px 20px; }
          .pn-row2 { grid-template-columns: 1fr; }
          .pn-row3 { grid-template-columns: 1fr; }
          .pn-appear-grid { grid-template-columns: 1fr; }
          .pn-tpl-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
