import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import { applyTheme, getStoredTheme, ThemeSlug } from "@/utils/themeLoader";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import UserAvatar from "@/components/UserAvatar";
import { User, Palette, Shield, Check, Upload, Eye, EyeOff, ChevronLeft } from "lucide-react";
import clsx from "clsx";

type Section = "perfil" | "aparencia" | "seguranca";
type ToastType = "success" | "error";

const THEMES = [
  { slug: "default"   as ThemeSlug, name: "FlowDesk",  previewBg: "#08222A", bars: ["#D4F2FB", "#A8E4F6", "#1EB6E8"] },
  { slug: "claro"     as ThemeSlug, name: "Claro",     previewBg: "#f1f5f9", bars: ["#64748B", "#475569", "#334155"] },
  { slug: "ayu"       as ThemeSlug, name: "Ayu",       previewBg: "#131922", bars: ["#FFF2D6", "#FFE6B3", "#FFAA33"] },
  { slug: "solarized" as ThemeSlug, name: "Solarized", previewBg: "#073642", bars: ["#E6FAF8", "#7BDED5", "#2AA198"] },
  { slug: "black"     as ThemeSlug, name: "Black",     previewBg: "#111111", bars: ["#E9F6FF", "#96D4FF", "#3EA6FF"] },
  { slug: "dracula"   as ThemeSlug, name: "Dracula",   previewBg: "#282A36", bars: ["#F7F2FF", "#D8C6FF", "#BD93F9"] },
  { slug: "material"  as ThemeSlug, name: "Material",  previewBg: "#1565C0", bars: ["#BBDEFB", "#64B5F6", "#2196F3"] },
  { slug: "tokyo"     as ThemeSlug, name: "Tokyo",     previewBg: "#13151F", bars: ["#C0CAF5", "#7AA2F7", "#9ECE6A"] },
  { slug: "one"       as ThemeSlug, name: "One Dark",  previewBg: "#11131C", bars: ["#5E678B", "#394159", "#232838"] },
  { slug: "lucy"      as ThemeSlug, name: "Lucy",      previewBg: "#111424", bars: ["#5F67B0", "#3A4073", "#222847"] },
];

const NAV: { id: Section; label: string; icon: typeof User }[] = [
  { id: "perfil",    label: "Perfil",    icon: User },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

function AvatarPickerModal({ onSelect, onClose }: { onSelect: (f: File) => void; onClose: () => void }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const f = items[i].getAsFile();
          if (f) { onSelect(f); break; }
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [onSelect]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-100">Escolher foto de perfil</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">PNG, JPEG ou WebP · máx. {IMAGE_SPECS.avatar.maxKB} KB</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors text-lg">✕</button>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={e => { const r = e.relatedTarget as Node | null; if (!r || !e.currentTarget.contains(r)) setDragging(false); }}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) onSelect(f); }}
          className={clsx("flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-10 px-6 transition-colors select-none", dragging ? "border-primary-400" : "border-primary-700")}
          style={{ background: dragging ? "color-mix(in srgb, var(--primary-700) 30%, transparent)" : "color-mix(in srgb, var(--primary-900) 30%, transparent)" }}
        >
          <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center transition-colors", dragging ? "bg-primary-600" : "bg-primary-700")}>
            <Upload size={20} className={dragging ? "text-primary-200" : "text-primary-400"} />
          </div>
          <div className="text-center">
            <p className="text-[14px] text-gray-200 font-medium">{dragging ? "Solte a imagem aqui" : "Arraste uma imagem aqui"}</p>
            {!dragging && <p className="text-[12px] text-gray-500 mt-1">Cole com Ctrl+V ou use o botão abaixo</p>}
          </div>
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full bg-primary-700 border border-primary-600 text-gray-100 rounded-lg py-2.5 text-[14px] font-medium hover:bg-primary-600 transition-colors">
          Selecionar arquivo
        </button>
        <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ""; }} />
        <div className="flex justify-end border-t border-primary-700 pt-4 -mb-1">
          <button type="button" onClick={onClose} className="bg-primary-800 border border-primary-600 text-gray-300 rounded-lg px-5 py-2 text-[14px] hover:bg-primary-700 transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function PortalConfiguracoesPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("perfil");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [theme, setTheme] = useState<ThemeSlug>("default");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [toast, setToast] = useState<{ open: boolean; type: ToastType; msg: string }>({ open: false, type: "success", msg: "" });
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      const u = session.user;
      setUser(u);
      setNome(u.user_metadata?.nome || "");
      setEmail(u.email || "");
      setTelefone(u.user_metadata?.telefone || "");
      setAvatarUrl(u.user_metadata?.avatar_url || null);
      if (typeof window !== "undefined") setTheme(getStoredTheme());
      setLoading(false);
    })();
  }, []);

  function showToast(type: ToastType, msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ open: true, type, msg });
    toastTimer.current = setTimeout(() => setToast(p => ({ ...p, open: false })), 4000);
  }

  function formatPhone(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (!d) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  async function doAvatarUpload(file: File) {
    if (!user) return;
    const path = `avatars/${user.id}_${Date.now()}.webp`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { showToast("error", "Erro ao enviar imagem."); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setDirty(true);
    showToast("success", "Foto atualizada — clique em salvar para confirmar.");
  }

  function handleAvatarSelected(file: File) {
    setShowAvatarPicker(false);
    triggerConverter(file, IMAGE_SPECS.avatar, doAvatarUpload);
  }

  async function salvarPerfil() {
    if (!user) return;
    setSaving(true);
    try {
      const updates: any = { data: { nome, telefone, avatar_url: avatarUrl } };
      if (email && email !== user.email) updates.email = email;
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setUser((prev: any) => prev ? { ...prev, email: updates.email || prev.email, user_metadata: { ...(prev.user_metadata || {}), nome, telefone, avatar_url: avatarUrl } } : prev);
      setDirty(false);
      showToast("success", "Perfil salvo com sucesso.");
    } catch (err: any) {
      showToast("error", "Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleTheme(slug: ThemeSlug) {
    setTheme(slug);
    applyTheme(slug);
    window.dispatchEvent(new Event("flowdesk:theme-updated"));
    showToast("success", "Tema aplicado.");
  }

  async function atualizarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarSenha) { showToast("error", "Preencha todos os campos."); return; }
    if (novaSenha.length < 6) { showToast("error", "A nova senha deve ter ao menos 6 caracteres."); return; }
    if (novaSenha === senhaAtual) { showToast("error", "A nova senha não pode ser igual à atual."); return; }
    if (novaSenha !== confirmarSenha) { showToast("error", "A confirmação não confere."); return; }
    const { data, error: ue } = await supabase.auth.getUser();
    if (ue || !data?.user?.email) { showToast("error", "Não foi possível validar o usuário."); return; }
    setChangingPwd(true);
    try {
      const { error: siErr } = await supabase.auth.signInWithPassword({ email: data.user.email, password: senhaAtual });
      if (siErr) { showToast("error", "Senha atual incorreta."); return; }
      const { error: upErr } = await supabase.auth.updateUser({ password: novaSenha });
      if (upErr) { showToast("error", "Erro ao atualizar senha."); return; }
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      showToast("success", "Senha atualizada com sucesso.");
    } finally {
      setChangingPwd(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
        <ClientSidebar defaultOpen={false} />
        <div className="ccfg-page">
          <header className="ccfg-head">
            <div className="ccfg-head-l">
              <div style={{ width: 100, height: 44, borderRadius: 12, background: "var(--primary-800)" }} className="animate-pulse" />
              <div style={{ width: 1, height: 38, background: "var(--gray-700)" }} />
              <div>
                <div style={{ width: 180, height: 26, borderRadius: 8, background: "var(--primary-800)", marginBottom: 6 }} className="animate-pulse" />
                <div style={{ width: 260, height: 14, borderRadius: 6, background: "var(--primary-800)" }} className="animate-pulse" />
              </div>
            </div>
          </header>
          <div className="ccfg-body">
            <div style={{ height: 360, borderRadius: 20, background: "var(--primary-800)" }} className="animate-pulse" />
          </div>
        </div>
        <style jsx global>{ccfgStyles}</style>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
      <ClientSidebar defaultOpen={false} />

      {showAvatarPicker && <AvatarPickerModal onSelect={handleAvatarSelected} onClose={() => setShowAvatarPicker(false)} />}
      {converterState && (
        <ImageConverterModal
          file={converterState.file}
          spec={converterState.spec}
          onAccept={converterState.onAccept}
          onCancel={cancelConverter}
        />
      )}

      {toast.open && (
        <div
          className={clsx("fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-[14.5px] font-semibold shadow-xl transition-all", toast.type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white")}
        >
          {toast.msg}
        </div>
      )}

      <div className="ccfg-page">
        <div className="ccfg-glow ccfg-glow-a" />
        <div className="ccfg-glow ccfg-glow-b" />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header className="ccfg-head">
            <div className="ccfg-head-l">
              <button type="button" onClick={() => router.back()} className="ccfg-back">
                <ChevronLeft size={17} />
                Voltar
              </button>
              <div className="ccfg-head-div" />
              <div>
                <h1 className="ccfg-h1">Configurações</h1>
                <p className="ccfg-sub">Perfil e preferências da sua conta</p>
              </div>
            </div>
            <div className="ccfg-user">
              <ClientHeaderProfile user={user} />
            </div>
          </header>

          <div className="ccfg-body">
            <aside className="ccfg-nav">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={clsx("ccfg-nav-item", section === id && "active")}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </aside>

            <main className="ccfg-main">

              {section === "perfil" && (
                <div className="ccfg-section">
                  <div className="ccfg-section-head">
                    <h2 className="ccfg-section-title">Perfil</h2>
                    <p className="ccfg-section-desc">Suas informações pessoais no portal.</p>
                  </div>

                  <div className="ccfg-card">
                    <h3 className="ccfg-card-title">Foto de perfil</h3>
                    <p className="ccfg-card-desc">{IMAGE_SPECS.avatar.hint}</p>
                    <div className="flex items-center gap-6 mt-5">
                      <UserAvatar src={avatarUrl} name={nome || null} size={80} className="!w-20 !h-20 border-2 border-gray-700 shrink-0" />
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => setShowAvatarPicker(true)} className="ccfg-btn">
                          Trocar foto
                        </button>
                        <span className="text-[12.5px] text-gray-500">Recomendado: imagem quadrada nítida.</span>
                      </div>
                    </div>
                  </div>

                  <div className="ccfg-card">
                    <h3 className="ccfg-card-title">Informações pessoais</h3>
                    <div className="ccfg-fields">
                      <label className="ccfg-field">
                        <span className="ccfg-label">Nome completo</span>
                        <input
                          type="text"
                          value={nome}
                          onChange={e => { setNome(e.target.value); setDirty(true); }}
                          className="ccfg-input"
                          placeholder="Seu nome"
                        />
                      </label>
                      <label className="ccfg-field">
                        <span className="ccfg-label">E-mail</span>
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setDirty(true); }}
                          className="ccfg-input"
                          placeholder="seu@email.com"
                        />
                      </label>
                      <label className="ccfg-field">
                        <span className="ccfg-label">Telefone</span>
                        <input
                          type="tel"
                          value={telefone}
                          onChange={e => { setTelefone(formatPhone(e.target.value)); setDirty(true); }}
                          className="ccfg-input"
                          placeholder="(00) 00000-0000"
                        />
                      </label>
                    </div>
                  </div>

                  {dirty && (
                    <div className="flex justify-end">
                      <button type="button" onClick={salvarPerfil} disabled={saving} className="ccfg-save-btn">
                        {saving ? (
                          <>
                            <span className="h-4 w-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                            Salvando...
                          </>
                        ) : "Salvar alterações"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {section === "aparencia" && (
                <div className="ccfg-section">
                  <div className="ccfg-section-head">
                    <h2 className="ccfg-section-title">Aparência</h2>
                    <p className="ccfg-section-desc">Escolha o tema visual do portal. A mudança é aplicada imediatamente.</p>
                  </div>

                  <div className="ccfg-card">
                    <h3 className="ccfg-card-title">Tema</h3>
                    <div className="ccfg-themes">
                      {THEMES.map(t => {
                        const sel = theme === t.slug;
                        return (
                          <button
                            key={t.slug}
                            type="button"
                            onClick={() => handleTheme(t.slug)}
                            className={clsx("ccfg-theme-btn", sel && "active")}
                          >
                            <div className="ccfg-theme-preview" style={{ backgroundColor: t.previewBg }}>
                              {t.bars.map((c, i) => (
                                <div key={i} className="ccfg-theme-bar" style={{ backgroundColor: c, width: i === 0 ? "100%" : i === 1 ? "85%" : "65%" }} />
                              ))}
                              {sel && (
                                <div className="ccfg-theme-check">
                                  <Check size={12} strokeWidth={2.8} />
                                </div>
                              )}
                            </div>
                            <span className="ccfg-theme-name">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {section === "seguranca" && (
                <div className="ccfg-section">
                  <div className="ccfg-section-head">
                    <h2 className="ccfg-section-title">Segurança</h2>
                    <p className="ccfg-section-desc">Gerencie o acesso e a proteção da sua conta.</p>
                  </div>

                  <div className="ccfg-card">
                    <h3 className="ccfg-card-title">Acesso</h3>
                    <div className="ccfg-pref-row" style={{ borderBottom: "1px solid var(--gray-700)" }}>
                      <div>
                        <p className="ccfg-pref-label">E-mail de acesso</p>
                        <p className="ccfg-pref-desc">Usado para login e recuperação de conta.</p>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "var(--gray-200)", whiteSpace: "nowrap" }}>{email || "—"}</span>
                    </div>
                    <div className="ccfg-pref-row">
                      <div>
                        <p className="ccfg-pref-label">Senha</p>
                        <p className="ccfg-pref-desc">Atualize periodicamente para manter a conta segura.</p>
                      </div>
                    </div>
                    <div className="ccfg-pwd-form">
                      <label className="ccfg-field">
                        <span className="ccfg-label">Senha atual</span>
                        <div className="ccfg-pwd-wrap">
                          <input type={showAtual ? "text" : "password"} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="ccfg-input" placeholder="••••••••" />
                          <button type="button" onClick={() => setShowAtual(v => !v)} className="ccfg-pwd-eye">{showAtual ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                        </div>
                      </label>
                      <label className="ccfg-field">
                        <span className="ccfg-label">Nova senha</span>
                        <div className="ccfg-pwd-wrap">
                          <input type={showNova ? "text" : "password"} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="ccfg-input" placeholder="Mínimo 6 caracteres" />
                          <button type="button" onClick={() => setShowNova(v => !v)} className="ccfg-pwd-eye">{showNova ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                        </div>
                      </label>
                      <label className="ccfg-field">
                        <span className="ccfg-label">Confirmar nova senha</span>
                        <div className="ccfg-pwd-wrap">
                          <input type={showConfirmar ? "text" : "password"} value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="ccfg-input" placeholder="Repita a nova senha" />
                          <button type="button" onClick={() => setShowConfirmar(v => !v)} className="ccfg-pwd-eye">{showConfirmar ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                        </div>
                      </label>
                      <div className="flex justify-end">
                        <button type="button" onClick={atualizarSenha} disabled={changingPwd || !senhaAtual || !novaSenha || !confirmarSenha} className="ccfg-save-btn">
                          {changingPwd ? (
                            <>
                              <span className="h-4 w-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                              Atualizando...
                            </>
                          ) : "Atualizar senha"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="ccfg-card">
                    <h3 className="ccfg-card-title">Boas práticas</h3>
                    <ul className="flex flex-col gap-3 mt-1">
                      {[
                        "Use ao menos 8 caracteres na senha.",
                        "Combine letras maiúsculas, minúsculas, números e símbolos.",
                        "Evite reutilizar senhas de outros serviços.",
                        "Nunca compartilhe sua senha com terceiros.",
                      ].map(tip => (
                        <li key={tip} className="relative pl-5 text-[14.5px] text-gray-300 list-none">
                          <span className="absolute left-1 top-[8px] w-[5px] h-[5px] rounded-full bg-primary-400 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>

      <style jsx global>{ccfgStyles}</style>
    </div>
  );
}

const ccfgStyles = `
  .ccfg-page {
    flex: 1; overflow-y: auto; overflow-x: hidden; position: relative; min-width: 0;
    background: var(--primary-900); -webkit-font-smoothing: antialiased;
  }
  .ccfg-page::-webkit-scrollbar { width: 6px; }
  .ccfg-page::-webkit-scrollbar-track { background: transparent; }
  .ccfg-page::-webkit-scrollbar-thumb { background-color: var(--gray-700); border-radius: 9999px; }
  .ccfg-page::-webkit-scrollbar-thumb:hover { background-color: var(--gray-600); }

  .ccfg-glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
  .ccfg-glow-a { width: 520px; height: 520px; left: -160px; bottom: -200px; background: radial-gradient(circle, rgba(30,182,232,0.14), transparent 70%); }
  .ccfg-glow-b { width: 460px; height: 460px; right: -150px; top: -120px; background: radial-gradient(circle, color-mix(in srgb, var(--primary-600) 60%, transparent), transparent 70%); }

  .ccfg-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 40px; border-bottom: 1px solid var(--gray-700); }
  .ccfg-head-l { display: flex; align-items: center; gap: 20px; }
  .ccfg-back { display: inline-flex; align-items: center; gap: 9px; height: 44px; padding: 0 18px; font-family: inherit; font-size: 15px; font-weight: 600; color: var(--gray-200); cursor: pointer; border-radius: 12px; border: 1px solid var(--gray-700); background: color-mix(in srgb, var(--primary-800) 40%, transparent); white-space: nowrap; transition: .18s; }
  .ccfg-back:hover { border-color: var(--primary-600); color: var(--gray-100); background: color-mix(in srgb, var(--primary-500) 8%, transparent); }
  .ccfg-head-div { width: 1px; height: 38px; background: var(--gray-700); }
  .ccfg-h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; }
  .ccfg-sub { margin: 4px 0 0; font-size: 14.5px; color: var(--gray-400); }
  .ccfg-user { display: flex; align-items: center; gap: 13px; }

  .ccfg-body { display: flex; gap: 0; max-width: 1100px; margin: 0 auto; padding: 36px 40px 60px; gap: 32px; align-items: flex-start; }

  .ccfg-nav { display: flex; flex-direction: column; gap: 2px; width: 200px; flex-shrink: 0; }
  .ccfg-nav-item { display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 14px; font-family: inherit; font-size: 15px; font-weight: 500; color: var(--gray-300); border-radius: 12px; border: none; background: transparent; cursor: pointer; text-align: left; transition: .16s; }
  .ccfg-nav-item:hover { color: var(--gray-100); background: color-mix(in srgb, var(--gray-300) 7%, transparent); }
  .ccfg-nav-item.active { color: var(--gray-100); font-weight: 600; background: color-mix(in srgb, var(--primary-500) 12%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-500) 28%, transparent); }
  .ccfg-nav-item.active svg { color: var(--primary-400); }

  .ccfg-main { flex: 1; min-width: 0; }
  .ccfg-section { display: flex; flex-direction: column; gap: 20px; }
  .ccfg-section-head { margin-bottom: 4px; }
  .ccfg-section-title { font-size: 28px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; margin: 0 0 6px; }
  .ccfg-section-desc { font-size: 14.5px; color: var(--gray-400); margin: 0; }

  .ccfg-card { border: 1px solid var(--gray-700); border-radius: 18px; padding: 26px 28px; background: linear-gradient(180deg, color-mix(in srgb, var(--primary-600) 12%, transparent), color-mix(in srgb, var(--primary-800) 28%, transparent)); }
  .ccfg-card-title { font-size: 17px; font-weight: 600; color: var(--gray-100); margin: 0 0 4px; }
  .ccfg-card-desc { font-size: 13.5px; color: var(--gray-400); margin: 0; }

  .ccfg-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 20px; }
  .ccfg-field { display: flex; flex-direction: column; gap: 8px; }
  .ccfg-label { font-size: 13.5px; font-weight: 500; color: var(--gray-300); }
  .ccfg-input { height: 52px; background: var(--primary-900); border: 1px solid var(--gray-700); border-radius: 13px; padding: 0 18px; font-family: inherit; font-size: 15px; color: var(--gray-100); outline: none; transition: border-color .16s; width: 100%; }
  .ccfg-input::placeholder { color: var(--gray-500); }
  .ccfg-input:hover { border-color: var(--gray-500); }
  .ccfg-input:focus { border-color: var(--primary-400); }

  .ccfg-pwd-form { display: flex; flex-direction: column; gap: 16px; }
  .ccfg-pwd-wrap { position: relative; }
  .ccfg-pwd-wrap .ccfg-input { padding-right: 48px; }
  .ccfg-pwd-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--gray-400); cursor: pointer; padding: 4px; display: flex; align-items: center; transition: color .14s; }
  .ccfg-pwd-eye:hover { color: var(--gray-200); }

  .ccfg-pref-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 0; }
  .ccfg-pref-row:first-of-type { padding-top: 0; }
  .ccfg-pref-label { font-size: 15px; font-weight: 600; color: var(--gray-100); margin: 0 0 4px; }
  .ccfg-pref-desc { font-size: 13.5px; color: var(--gray-400); margin: 0; }

  .ccfg-btn { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 20px; font-family: inherit; font-size: 14.5px; font-weight: 600; color: var(--gray-100); border-radius: 12px; border: 1px solid var(--gray-600); background: transparent; cursor: pointer; white-space: nowrap; transition: .16s; }
  .ccfg-btn:hover { border-color: var(--primary-500); color: var(--primary-200); }

  .ccfg-save-btn { display: inline-flex; align-items: center; gap: 8px; height: 46px; padding: 0 24px; font-family: inherit; font-size: 15px; font-weight: 600; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%); color: var(--primary-900); box-shadow: 0 10px 24px -12px rgba(30,182,232,0.8); transition: .16s; }
  .ccfg-save-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .ccfg-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ccfg-themes { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-top: 20px; }
  .ccfg-theme-btn { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 14px; border: 1px solid var(--gray-700); background: color-mix(in srgb, var(--primary-900) 30%, transparent); cursor: pointer; transition: .18s; }
  .ccfg-theme-btn:hover:not(.active) { border-color: var(--gray-500); transform: translateY(-2px); }
  .ccfg-theme-btn.active { border-color: var(--primary-500); box-shadow: 0 0 0 1px var(--primary-500), 0 10px 26px -14px color-mix(in srgb, var(--primary-500) 60%, transparent); }
  .ccfg-theme-preview { position: relative; display: flex; flex-direction: column; justify-content: center; gap: 6px; height: 72px; padding: 12px; border-radius: 9px; }
  .ccfg-theme-bar { height: 5px; border-radius: 3px; }
  .ccfg-theme-check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; display: grid; place-items: center; background: var(--primary-500); border-radius: 50%; color: var(--primary-900); }
  .ccfg-theme-name { font-size: 13px; font-weight: 600; color: var(--gray-200); text-align: center; }
`;
