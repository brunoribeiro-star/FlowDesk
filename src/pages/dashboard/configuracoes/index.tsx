"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

type ViewMode = "list" | "board";

type ToastType = "success" | "error" | "info";

type ToastState = {
  open: boolean;
  type: ToastType;
  message: string;
};

function Modal({
  open,
  title,
  children,
  onClose,
  actions,
}: {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-primary-800 border border-primary-700 rounded-xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] text-primary-100 font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-3 py-1 text-[14px] hover:bg-primary-700"
            >
              Fechar
            </button>
          </div>
        )}
        <div className="text-gray-100 text-[15px]">{children}</div>
        {actions && <div className="mt-6 flex items-center justify-end gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [userData, setUserData] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [prefViewMode, setPrefViewMode] = useState<ViewMode>("list");
  const [prefSidebarDefault, setPrefSidebarDefault] = useState(true);
  const [prefNotificacoes, setPrefNotificacoes] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: "info",
    message: "",
  });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarNovaSenha, setShowConfirmarNovaSenha] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  function showToast(type: ToastType, message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ open: true, type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 4000);
  }

  function closeToast() {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast((prev) => ({ ...prev, open: false }));
  }

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setLoading(false);
        return;
      }

      const user = data.user;
      setUserData(user);

      setNome(user.user_metadata?.nome || "");
      setEmail(user.email || "");
      setTelefone(user.user_metadata?.telefone || "");
      setAvatarUrl(user.user_metadata?.avatar_url || null);

      if (typeof window !== "undefined") {
        const viewMode = (localStorage.getItem("flowdesk_view_mode") as ViewMode) || "list";
        const sidebar = localStorage.getItem("flowdesk_sidebar");
        const notifs = localStorage.getItem("flowdesk_notifs");

        setPrefViewMode(viewMode);
        setPrefSidebarDefault(sidebar !== "closed");
        setPrefNotificacoes(notifs !== "off");
      }

      setLoading(false);
    }

    loadUser();
  }, []);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (!hasUnsavedChanges || url === router.asPath) return;

      setShowLeaveModal(true);
      setPendingRoute(url);

      router.events.emit("routeChangeError");
      throw "routeChange aborted by FlowDesk settings page";
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [hasUnsavedChanges, router]);

  const [phoneCountryCode] = useState("+55");

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";

    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setTelefone(formatted);
    setHasUnsavedChanges(true);
  }

  async function salvarTudo() {
    if (!userData) return;
    try {
      setSaving(true);

      const updates: any = {
        data: {
          nome,
          telefone,
          avatar_url: avatarUrl,
        },
      };

      if (email && email !== userData.email) {
        updates.email = email;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      if (typeof window !== "undefined") {
        localStorage.setItem("flowdesk_view_mode", prefViewMode);
        localStorage.setItem("flowdesk_sidebar", prefSidebarDefault ? "open" : "closed");
        localStorage.setItem("flowdesk_notifs", prefNotificacoes ? "on" : "off");
      }

      setUserData((prev: any) =>
        prev
          ? {
              ...prev,
              email: updates.email || prev.email,
              user_metadata: {
                ...(prev.user_metadata || {}),
                nome,
                telefone,
                avatar_url: avatarUrl,
              },
            }
          : prev
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("flowdesk:user-updated", {
            detail: {
              nome,
              telefone,
              avatar_url: avatarUrl,
              email,
            },
          })
        );
      }

      setHasUnsavedChanges(false);
      showToast("success", "Alterações salvas com sucesso.");
    } catch (err: any) {
      showToast("error", "Erro ao salvar alterações: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function enviarAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userData) return;

    try {
      const filePath = `avatars/${userData.id}_${Date.now()}.png`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (error) {
        showToast("error", "Erro ao enviar imagem: " + error.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setHasUnsavedChanges(true);
      showToast("success", "Foto de perfil atualizada (clique em salvar alterações).");
    } catch (err: any) {
      showToast("error", "Erro ao enviar imagem: " + err.message);
    }
  }

  async function handleTrocarSenha() {
    setShowPasswordModal(true);
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
  }

  async function atualizarSenha() {
    try {
      if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
        showToast("error", "Preencha todos os campos de senha.");
        return;
      }

      if (novaSenha.length < 6) {
        showToast("error", "A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (novaSenha === senhaAtual) {
        showToast("error", "A nova senha não pode ser igual à senha atual.");
        return;
      }

      if (novaSenha !== confirmarNovaSenha) {
        showToast("error", "A confirmação da nova senha não confere.");
        return;
      }

      const { data, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !data?.user || !data.user.email) {
        showToast("error", "Não foi possível validar o usuário.");
        return;
      }

      setChangingPassword(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: senhaAtual,
      });

      if (signInError) {
        setChangingPassword(false);
        showToast("error", "Senha atual incorreta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        setChangingPassword(false);
        showToast("error", "Erro ao atualizar senha: " + updateError.message);
        return;
      }

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setShowPasswordModal(false);
      setChangingPassword(false);
      showToast("success", "Senha atualizada com sucesso!");
    } catch (err: any) {
      setChangingPassword(false);
      showToast("error", "Erro ao atualizar senha: " + err.message);
    }
  }

  function confirmarSaidaSemSalvar() {
    setShowLeaveModal(false);
    setHasUnsavedChanges(false);

    if (pendingRoute) {
      const target = pendingRoute;
      setPendingRoute(null);
      router.push(target);
    }
  }

  function continuarEditando() {
    setShowLeaveModal(false);
    setPendingRoute(null);
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-100">
        Carregando...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={prefSidebarDefault} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-y-auto custom-scrollbar">
        <h1 className="text-[32px] text-gray-200 font-semibold">Configurações</h1>

        <div className="bg-primary-800 border border-primary-700 rounded-lg p-6 flex flex-col gap-6">
          <h2 className="text-[22px] text-primary-100 font-semibold">Perfil</h2>

          <div className="flex items-center gap-6">
            <div className="relative w-[100px] h-[100px] rounded-full border border-primary-600 overflow-hidden">
              <Image
                src={avatarUrl || "/perfil.svg"}
                alt="Avatar"
                fill
                className="object-cover"
              />
            </div>

            <label className="bg-primary-700 border border-primary-600 rounded-lg px-4 py-2 cursor-pointer hover:bg-primary-600 text-[15px]">
              <span className="text-primary-100">Trocar foto</span>
              <input type="file" className="hidden" accept="image/*" onChange={enviarAvatar} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <label className="flex flex-col gap-2 text-[14px]">
              <span className="text-gray-300">Nome completo</span>
              <input
                type="text"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-2 text-gray-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-[14px]">
              <span className="text-gray-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-2 text-gray-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-[14px]">
              <span className="text-gray-300">Telefone</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 bg-primary-900 border border-primary-700 rounded-lg px-3 py-2 text-[14px] text-gray-100"
                >
                  <span className="text-lg">🇧🇷</span>
                  <span className="text-gray-100">{phoneCountryCode}</span>
                </button>
                <input
                  type="tel"
                  value={telefone}
                  onChange={handlePhoneChange}
                  className="flex-1 bg-primary-900 border border-primary-700 rounded-lg px-4 py-2 text-gray-100"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="bg-primary-800 border border-primary-700 rounded-lg p-6 flex flex-col gap-4">
          <h2 className="text-[22px] text-primary-100 font-semibold">Segurança</h2>
          <p className="text-[14px] text-gray-300">
            Mantenha sua conta segura atualizando sua senha regularmente.
          </p>

          <button
            type="button"
            onClick={handleTrocarSenha}
            className="bg-primary-800 border border-primary-600 text-gray-100 rounded-lg px-6 py-3 text-[15px] font-medium hover:bg-primary-700 w-fit"
          >
            Trocar senha
          </button>
        </div>

        <div className="bg-primary-800 border border-primary-700 rounded-lg p-6 flex flex-col gap-6">
          <h2 className="text-[22px] text-primary-100 font-semibold">Preferências</h2>

          <div className="flex flex-col gap-4 text-[14px]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-gray-300">Visualização padrão dos projetos</span>
              <div className="flex items-center bg-primary-900 border border-primary-700 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPrefViewMode("list");
                    setHasUnsavedChanges(true);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    prefViewMode === "list"
                      ? "bg-primary-500 text-primary-900"
                      : "text-gray-300"
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrefViewMode("board");
                    setHasUnsavedChanges(true);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    prefViewMode === "board"
                      ? "bg-primary-500 text-primary-900"
                      : "text-gray-300"
                  }`}
                >
                  Quadros
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-gray-300">Sidebar aberta ao entrar</span>
              <button
                type="button"
                onClick={() => {
                  setPrefSidebarDefault((prev) => !prev);
                  setHasUnsavedChanges(true);
                }}
                className={`relative inline-flex items-center h-6 w-11 rounded-full border border-primary-700 transition-colors ${
                  prefSidebarDefault ? "bg-primary-500" : "bg-primary-900"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-primary-900 transform transition-transform ${
                    prefSidebarDefault ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-gray-300">Notificações do sistema</span>
              <button
                type="button"
                onClick={() => {
                  setPrefNotificacoes((prev) => !prev);
                  setHasUnsavedChanges(true);
                }}
                className={`relative inline-flex items-center h-6 w-11 rounded-full border border-primary-700 transition-colors ${
                  prefNotificacoes ? "bg-primary-500" : "bg-primary-900"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-primary-900 transform transition-transform ${
                    prefNotificacoes ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={salvarTudo}
            disabled={saving || !hasUnsavedChanges}
            className={`bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-8 py-3 text-[16px] font-semibold transition-colors ${
              saving || !hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      <Modal
        open={showPasswordModal}
        title="Trocar senha"
        onClose={() => {
          if (!changingPassword) setShowPasswordModal(false);
        }}
        actions={
          <>
            <button
              type="button"
              onClick={() => !changingPassword && setShowPasswordModal(false)}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[14px] hover:bg-primary-700"
              disabled={changingPassword}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={atualizarSenha}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-5 py-2 text-[14px] font-semibold"
              disabled={changingPassword}
            >
              {changingPassword ? "Atualizando..." : "Confirmar troca"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-[14px]">
            <span>Senha atual</span>
            <div className="relative">
              <input
                type={showSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full bg-primary-900 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowSenhaAtual((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200 text-sm"
              >
                {showSenhaAtual ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-[14px]">
            <span>Nova senha</span>
            <div className="relative">
              <input
                type={showNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-primary-900 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200 text-sm"
              >
                {showNovaSenha ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-[14px]">
            <span>Confirmar nova senha</span>
            <div className="relative">
              <input
                type={showConfirmarNovaSenha ? "text" : "password"}
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                className="w-full bg-primary-900 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmarNovaSenha((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200 text-sm"
              >
                {showConfirmarNovaSenha ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showLeaveModal}
        title="Descartar alterações?"
        onClose={continuarEditando}
        actions={
          <>
            <button
              type="button"
              onClick={continuarEditando}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[14px] hover:bg-primary-700"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={confirmarSaidaSemSalvar}
              className="bg-red-500 hover:bg-red-400 text-primary-50 rounded-lg px-5 py-2 text-[14px] font-semibold"
            >
              Descartar alterações
            </button>
          </>
        }
      >
        <p className="text-[15px] text-gray-100">
          Você fez alterações nas configurações que ainda não foram salvas. Tem certeza de que deseja sair sem salvar?
        </p>
      </Modal>

      {toast.open && (
        <div className="fixed bottom-6 right-6 z-[70]">
          <div className="flex items-start gap-3 bg-primary-800 border border-primary-600 rounded-lg px-4 py-3 shadow-xl min-w-[260px] max-w-[360px] animate-[fadeIn_0.2s_ease-out]">
            <div className="mt-0.5">
              {toast.type === "success" && <span className="text-green-400 text-xl">✓</span>}
              {toast.type === "error" && <span className="text-red-400 text-xl">!</span>}
              {toast.type === "info" && <span className="text-primary-300 text-xl">i</span>}
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-primary-100 leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={closeToast}
              className="text-gray-400 hover:text-gray-200 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-500);
          border-radius: 9999px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}