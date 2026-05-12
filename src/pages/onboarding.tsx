import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Check, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { useImageConverter } from "@/hooks/useImageConverter";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import AuthBackground from "@/components/auth/AuthBackground";

const THEMES = [
  { value: "default",   label: "FlowDesk",   bg: "#06191F", accent: "#1EB6E8" },
  { value: "claro",     label: "Claro",       bg: "#f1f5f9", accent: "#64748b" },
  { value: "black",     label: "Black",       bg: "#000000", accent: "#3ea6ff" },
  { value: "dracula",   label: "Dracula",     bg: "#1e1f29", accent: "#bd93f9" },
  { value: "material",  label: "Material",    bg: "#0d47a1", accent: "#2196f3" },
  { value: "tokyo",     label: "Tokyo Night", bg: "#0f1117", accent: "#7aa2f7" },
  { value: "lucy",      label: "Lucy",        bg: "#0d0f1a", accent: "#9d8cd5" },
  { value: "one",       label: "One Dark",    bg: "#0c0e15", accent: "#8b8fa8" },
  { value: "ayu",       label: "Ayu",         bg: "#0a0e14", accent: "#ffaa33" },
  { value: "solarized", label: "Solarized",   bg: "#002b36", accent: "#2aa198" },
] as const;

const VIEW_MODES = [
  { value: "list",  label: "Lista",  desc: "Tarefas exibidas em lista vertical" },
  { value: "board", label: "Kanban", desc: "Colunas por status (estilo board)" },
];

const SIDEBAR_OPTS = [
  { value: "true",  label: "Aberta",  desc: "Sidebar visível ao entrar" },
  { value: "false", label: "Fechada", desc: "Sidebar recolhida ao entrar" },
];

function applyThemePreview(themeValue: string) {
  const existing = document.getElementById("flowdesk-theme");
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.id = "flowdesk-theme";
  link.href = `/styles/themes/${themeValue}.css`;
  document.head.appendChild(link);
}

function Card({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`w-full rounded-2xl p-8 ${wide ? "max-w-lg" : "max-w-md"}`}
      style={{
        background: "color-mix(in srgb, var(--primary-800) 55%, transparent)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid var(--primary-700)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.50)",
      }}
    >
      {children}
    </div>
  );
}

function Option({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-xl text-left w-full transition-colors"
      style={{
        background: selected
          ? "color-mix(in srgb, var(--primary-500) 10%, transparent)"
          : "var(--primary-800)",
        border: selected
          ? "1px solid var(--primary-500)"
          : "1px solid var(--primary-700)",
      }}
    >
      <div
        className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          border: selected ? "2px solid var(--primary-500)" : "2px solid var(--gray-500)",
        }}
      >
        {selected && (
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--primary-500)" }} />
        )}
      </div>
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLButtonElement | null>(null);
  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nome, setNome] = useState(
    user?.user_metadata?.nome || user?.user_metadata?.name || ""
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState("default");
  const [viewMode, setViewMode] = useState("list");
  const [sidebar, setSidebar] = useState("true");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.onboarding_completed) {
      router.replace("/dashboard");
    }
  }, [user]);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  function processFile(file: File) {
    triggerConverter(
      file,
      IMAGE_SPECS.avatar,
      (accepted) => {
        setAvatarFile(accepted);
        setAvatarUrl(URL.createObjectURL(accepted));
      },
      fileInputRef as React.RefObject<HTMLInputElement>
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleThemeSelect(value: string) {
    setTheme(value);
    applyThemePreview(value);
  }

  async function handleSkip() {
    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    router.push("/dashboard");
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);

    let finalAvatarUrl = avatarUrl;

    if (avatarFile && user) {
      const path = `avatars/${user.id}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: "image/webp" });

      if (!uploadError) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        finalAvatarUrl = data.publicUrl;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { nome: nome.trim(), avatar_url: finalAvatarUrl, onboarding_completed: true },
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("flowdesk_theme", theme);
      localStorage.setItem("projetosViewMode", viewMode);
      localStorage.setItem("sidebar_open", sidebar);

      window.dispatchEvent(new CustomEvent("flowdesk:theme-updated"));
      window.dispatchEvent(new CustomEvent("flowdesk:user-updated", {
        detail: { nome: nome.trim(), avatar_url: finalAvatarUrl },
      }));
    }

    router.push("/dashboard");
  }

  return (
    <AuthBackground>
      {converterState && (
        <ImageConverterModal
          file={converterState.file}
          spec={converterState.spec}
          onAccept={converterState.onAccept}
          onCancel={() => cancelConverter(fileInputRef as React.RefObject<HTMLInputElement>)}
        />
      )}

      <Card wide={step === 2}>
        <div className="flex items-center justify-between mb-6">
          <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={120} height={32} priority />
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs transition-colors"
            style={{ color: "var(--gray-500)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gray-300)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gray-500)"; }}
          >
            Pular configuração →
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--gray-100)" }}>
              {step === 1 && "Seu perfil"}
              {step === 2 && "Escolha um tema"}
              {step === 3 && "Preferências"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--gray-400)" }}>
              Passo {step} de 3
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: step === s ? "24px" : "16px",
                  background: s <= step ? "var(--primary-500)" : "var(--primary-700)",
                }}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3">
              <button
                ref={dropZoneRef}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="relative w-24 h-24 rounded-full overflow-hidden transition-all"
                style={{
                  border: isDragging
                    ? "2px dashed var(--primary-500)"
                    : "2px solid var(--primary-700)",
                  outline: isDragging ? "3px solid color-mix(in srgb, var(--primary-500) 25%, transparent)" : "none",
                }}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1"
                    style={{ background: isDragging ? "color-mix(in srgb, var(--primary-500) 12%, var(--primary-800))" : "var(--primary-800)" }}
                  >
                    <Camera className="w-7 h-7" style={{ color: "var(--primary-500)" }} />
                  </div>
                )}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="text-center">
                <p className="text-xs font-medium" style={{ color: "var(--gray-300)" }}>
                  Foto de perfil{" "}
                  <span style={{ color: "var(--gray-500)" }}>(opcional)</span>
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--gray-500)" }}>
                  Clique, arraste ou cole (Ctrl+V) uma imagem
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--gray-500)" }}>
                  PNG, JPEG ou WebP · 256×256 px · máx. 80 KB
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--gray-500)" }}>
                  Outros formatos ou tamanhos são convertidos automaticamente
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--gray-200)" }}>
                Nome profissional{" "}
                <span style={{ color: "var(--error-medium)" }}>*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como quer ser chamado no FlowDesk?"
                maxLength={100}
                className="w-full h-11 rounded-xl text-sm focus:outline-none transition-colors px-4"
                style={{
                  background: "var(--primary-800)",
                  border: "1px solid var(--primary-700)",
                  color: "var(--gray-100)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary-500)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--primary-700)"; }}
              />
            </div>

            <button
              type="button"
              disabled={!nome.trim()}
              onClick={() => setStep(2)}
              className="w-full h-11 rounded-xl text-sm font-semibold mt-1 transition-opacity"
              style={{
                background: "var(--primary-500)",
                color: "var(--primary-900)",
                opacity: !nome.trim() ? 0.5 : 1,
              }}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "var(--gray-400)" }}>
              O tema muda em tempo real enquanto você escolhe.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleThemeSelect(t.value)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                  style={{
                    background: theme === t.value
                      ? "color-mix(in srgb, var(--primary-500) 10%, transparent)"
                      : "var(--primary-800)",
                    border: theme === t.value
                      ? "1px solid var(--primary-500)"
                      : "1px solid var(--primary-700)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: t.bg, border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: t.accent }} />
                  </div>
                  <span
                    className="text-sm font-medium flex-1 text-left"
                    style={{ color: theme === t.value ? "var(--primary-400)" : "var(--gray-200)" }}
                  >
                    {t.label}
                  </span>
                  {theme === t.value && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary-500)" }} />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 px-4 rounded-xl text-sm flex items-center gap-1.5"
                style={{
                  background: "var(--primary-800)",
                  border: "1px solid var(--primary-700)",
                  color: "var(--gray-300)",
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 h-11 rounded-xl text-sm font-semibold"
                style={{ background: "var(--primary-500)", color: "var(--primary-900)" }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" style={{ color: "var(--gray-200)" }}>
                Visualização padrão dos projetos
              </label>
              <div className="flex flex-col gap-2">
                {VIEW_MODES.map((v) => (
                  <Option
                    key={v.value}
                    selected={viewMode === v.value}
                    onClick={() => setViewMode(v.value)}
                  >
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: viewMode === v.value ? "var(--primary-400)" : "var(--gray-100)" }}
                      >
                        {v.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--gray-400)" }}>
                        {v.desc}
                      </p>
                    </div>
                  </Option>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" style={{ color: "var(--gray-200)" }}>
                Sidebar padrão
              </label>
              <div className="flex flex-col gap-2">
                {SIDEBAR_OPTS.map((s) => (
                  <Option
                    key={s.value}
                    selected={sidebar === s.value}
                    onClick={() => setSidebar(s.value)}
                  >
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: sidebar === s.value ? "var(--primary-400)" : "var(--gray-100)" }}
                      >
                        {s.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--gray-400)" }}>
                        {s.desc}
                      </p>
                    </div>
                  </Option>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: "var(--error-medium)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-11 px-4 rounded-xl text-sm flex items-center gap-1.5"
                style={{
                  background: "var(--primary-800)",
                  border: "1px solid var(--primary-700)",
                  color: "var(--gray-300)",
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFinish}
                className="flex-1 h-11 rounded-xl text-sm font-semibold transition-opacity"
                style={{
                  background: "var(--primary-500)",
                  color: "var(--primary-900)",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Salvando..." : "Ir para o FlowDesk"}
              </button>
            </div>
          </div>
        )}
      </Card>
    </AuthBackground>
  );
}
