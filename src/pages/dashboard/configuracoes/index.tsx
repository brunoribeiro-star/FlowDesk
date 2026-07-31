"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import Toggle from "@/components/ui/Toggle";
import { applyTheme, getStoredTheme, ThemeSlug } from "@/utils/themeLoader";
import { User, Palette, LayoutGrid, Shield, Eye, EyeOff, Check, Upload, CreditCard, Zap, HardDrive, ExternalLink, ChevronLeft, ChevronRight, Trash2, FileText, File, FolderOpen, AlertTriangle, QrCode } from "lucide-react";
import clsx from "clsx";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_PRICES, TRIAL_DAYS, type BillingPeriod } from "@/lib/stripeConfig";

type SettingsSection = "perfil" | "aparencia" | "exibicao" | "seguranca" | "assinatura" | "armazenamento";
type ToastType = "success" | "error" | "info";
type ToastState = { open: boolean; type: ToastType; message: string };
type ViewMode = "list" | "board";

type ThemePreview = {
  slug: ThemeSlug;
  name: string;
  previewBg: string;
  bars: string[];
};

const THEMES: ThemePreview[] = [
  { slug: "default",   name: "FlowDesk",  previewBg: "#08222A", bars: ["#D4F2FB", "#A8E4F6", "#1EB6E8"] },
  { slug: "claro",     name: "Claro",     previewBg: "#f1f5f9", bars: ["#64748B", "#475569", "#334155"] },
  { slug: "ayu",       name: "Ayu",       previewBg: "#131922", bars: ["#FFF2D6", "#FFE6B3", "#FFAA33"] },
  { slug: "solarized", name: "Solarized", previewBg: "#073642", bars: ["#E6FAF8", "#7BDED5", "#2AA198"] },
  { slug: "black",     name: "Black",     previewBg: "#111111", bars: ["#E9F6FF", "#96D4FF", "#3EA6FF"] },
  { slug: "dracula",   name: "Dracula",   previewBg: "#282A36", bars: ["#F7F2FF", "#D8C6FF", "#BD93F9"] },
  { slug: "material",  name: "Material",  previewBg: "#1565C0", bars: ["#BBDEFB", "#64B5F6", "#2196F3"] },
  { slug: "tokyo",     name: "Tokyo",     previewBg: "#13151F", bars: ["#C0CAF5", "#7AA2F7", "#9ECE6A"] },
  { slug: "one",       name: "One Dark",  previewBg: "#11131C", bars: ["#5E678B", "#394159", "#232838"] },
  { slug: "lucy",      name: "Lucy",      previewBg: "#111424", bars: ["#5F67B0", "#3A4073", "#222847"] },
];

type NavItem = {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { id: "perfil",        label: "Perfil",         icon: User },
  { id: "aparencia",     label: "Aparência",      icon: Palette },
  { id: "exibicao",      label: "Exibição",       icon: LayoutGrid },
  { id: "seguranca",     label: "Segurança",      icon: Shield },
  { id: "assinatura",    label: "Assinatura",     icon: CreditCard },
  { id: "armazenamento", label: "Armazenamento",  icon: HardDrive },
];

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-full border border-gray-700 bg-primary-900 shrink-0">
      {(["list", "board"] as ViewMode[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={clsx(
            "px-5 py-[9px] rounded-full text-[14.5px] font-semibold transition-all",
            value === v
              ? "bg-gradient-to-br from-primary-300 to-primary-500 text-primary-900"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          {v === "list" ? "Lista" : "Quadros"}
        </button>
      ))}
    </div>
  );
}

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
        className="w-full max-w-lg bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-6">
            <h2 className="text-[18px] text-primary-100 font-semibold">{title}</h2>
          </div>
        )}
        <div className="text-gray-100 text-[15px]">{children}</div>
        {actions && (
          <div className="mt-6 flex items-center justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-[30px]">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[30px] font-bold text-gray-100 tracking-tight leading-none">{title}</h2>
        {action}
      </div>
      {description && <p className="text-[15.5px] text-gray-400 mt-2 max-w-[720px]">{description}</p>}
    </header>
  );
}

function Card({
  children,
  className,
  title,
  desc,
  icon: TitleIcon,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  desc?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div
      className={clsx("border border-gray-700 rounded-[18px] py-5 px-4 sm:py-[26px] sm:px-7", className)}
      style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--primary-600) 16%, transparent), color-mix(in srgb, var(--primary-800) 30%, transparent))" }}
    >
      {title && (
        <div className="mb-[22px]">
          <h3 className="flex items-center gap-[10px] text-[18px] font-semibold text-gray-100 m-0">
            {TitleIcon && <TitleIcon size={19} className="text-primary-400 shrink-0" />}
            {title}
          </h3>
          {desc && <p className="text-[14.5px] text-gray-400 mt-2">{desc}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[10px]">
      <span className="text-[14.5px] font-medium text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function PrefRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-6 py-5 first:pt-0",
        last ? "pb-0" : ""
      )}
      style={!last ? { borderBottom: "1px solid var(--gray-700)" } : undefined}
    >
      <div className="flex flex-col gap-[5px] min-w-0">
        <span className="text-[16px] font-semibold text-gray-100">{label}</span>
        {description && (
          <span className="text-[14px] text-gray-400 leading-snug">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function AvatarPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (file: File) => void;
  onClose: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) onSelect(file);
          break;
        }
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onSelect]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onSelect(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onSelect(file);
    e.target.value = "";
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)] flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-100">Escolher foto de perfil</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">PNG, JPEG ou WebP · máx. {IMAGE_SPECS.avatar.maxKB} KB</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => {
            const rel = e.relatedTarget as Node | null;
            if (!rel || !e.currentTarget.contains(rel)) setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={clsx(
            "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-10 px-6 transition-colors select-none",
            isDragging ? "border-primary-400" : "border-primary-700"
          )}
          style={{ background: isDragging
            ? "color-mix(in srgb, var(--primary-700) 30%, transparent)"
            : "color-mix(in srgb, var(--primary-900) 30%, transparent)"
          }}
        >
          <div className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isDragging ? "bg-primary-600" : "bg-primary-700"
          )}>
            <Upload size={20} className={isDragging ? "text-primary-200" : "text-primary-400"} />
          </div>
          <div className="text-center">
            <p className="text-[14px] text-gray-200 font-medium">
              {isDragging ? "Solte a imagem aqui" : "Arraste uma imagem aqui"}
            </p>
            <p className="text-[12px] text-gray-500 mt-1">
              {isDragging ? "" : "Cole com Ctrl+V ou use o botão abaixo"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-primary-700 border border-primary-600 text-gray-100 rounded-lg py-2.5 text-[14px] font-medium hover:bg-primary-600 transition-colors"
        >
          Selecionar arquivo
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />

        <div className="flex justify-end border-t border-primary-700 pt-4 -mb-1">
          <button
            type="button"
            onClick={onClose}
            className="bg-primary-800 border border-primary-600 text-gray-300 rounded-lg px-5 py-2 text-[14px] hover:bg-primary-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const router = useRouter();

  const [section, setSection] = useState<SettingsSection>("perfil");
  const subscription = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("mensal");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  function isCurrentPlan(plan: string): boolean {
    if (subscription.isTrialActive || subscription.plan !== plan) return false;
    if (subscription.isLifetime) return true;
    if (!subscription.currentPeriodEnd) return false;
    if (subscription.billingInterval === null) return true;
    return subscription.billingInterval === billingPeriod;
  }
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const [userData, setUserData] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  type PixTipo = "" | "email" | "telefone" | "cpf_cnpj" | "aleatoria";
  const [pixTipo, setPixTipo] = useState<PixTipo>("");
  const [pixValor, setPixValor] = useState("");
  const [pixPaisCode, setPixPaisCode] = useState("55");
  const [pixPaisOpen, setPixPaisOpen] = useState(false);
  const pixPaisRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [theme, setTheme] = useState<ThemeSlug>("default");
  const [sidebarDefault, setSidebarDefault] = useState(() => typeof window !== "undefined" ? localStorage.getItem("sidebar_open") !== "false" : true);

  const [projetosView, setProjetosView] = useState<ViewMode>("list");
  const [tarefasView, setTarefasView] = useState<ViewMode>("list");
  const [briefingsView, setBriefingsView] = useState<ViewMode>("list");
  const [propostasView, setPropostasView] = useState<ViewMode>("list");
  const [clientesView, setClientesView] = useState<ViewMode>("list");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [toast, setToast] = useState<ToastState>({ open: false, type: "info", message: "" });
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [loading, setLoading] = useState(true);

  type StorageFile = { id: string; nome: string; url: string; created_at: string; projeto_id: string };
  type StorageProject = { id: string; titulo: string; completed_at: string; status: string; files: StorageFile[] };
  const [storageProjects, setStorageProjects] = useState<StorageProject[]>([]);
  const [storageUsage, setStorageUsage] = useState<{ usedGB: number; limitGB: number } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    const { tab, checkout, storage } = router.query;
    if (tab === "assinatura") setSection("assinatura");
    if (tab === "armazenamento") setSection("armazenamento");

    if (checkout === "success" || storage === "added") {
      const timer = setTimeout(() => {
        subscription.refresh();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [router.query]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) { setLoading(false); return; }

      const user = data.user;
      setUserData(user);
      setNome(user.user_metadata?.nome || "");
      setEmail(user.email || "");
      setTelefone(user.user_metadata?.telefone || "");
      setAvatarUrl(user.user_metadata?.avatar_url || null);
      setPixTipo((user.user_metadata?.pix_chave_tipo as PixTipo) || "");
      setPixValor(user.user_metadata?.pix_chave_valor || "");
      setPixPaisCode(user.user_metadata?.pix_chave_pais || "55");

      if (typeof window !== "undefined") {
        const storedTheme = getStoredTheme();
        setTheme(storedTheme);

        const pv = localStorage.getItem("projetosViewMode");
        if (pv === "list" || pv === "board") setProjetosView(pv);

        const tv = localStorage.getItem("tarefasViewMode");
        if (tv === "list" || tv === "board") setTarefasView(tv);

        const bv = localStorage.getItem("briefingsViewMode");
        if (bv === "list" || bv === "board") setBriefingsView(bv);

        const prv = localStorage.getItem("proposalsViewMode");
        if (prv === "list" || prv === "board") setPropostasView(prv);

        try {
          const cv = JSON.parse(localStorage.getItem("clientesParams") || "{}");
          if (cv.viewMode === "list" || cv.viewMode === "board") setClientesView(cv.viewMode);
        } catch {}
      }

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (section !== "armazenamento" || !userData) return;
    loadStorageData();
  }, [section, userData]);

  async function loadStorageData() {
    const CACHE_KEY = "flowdesk_storage_cache";
    const CACHE_TTL = 5 * 60 * 1000;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { usedGB, limitGB, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) setStorageUsage({ usedGB, limitGB });
      }
    } catch {}

    setStorageLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        fetch("/api/subscription/storage-usage", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((u) => {
            if (!u) return;
            setStorageUsage({ usedGB: u.usedGB, limitGB: u.limitGB });
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ usedGB: u.usedGB, limitGB: u.limitGB, ts: Date.now() }));
            } catch {}
          })
          .catch(() => {});
      }

      const { data: projs } = await supabase
        .from("projetos")
        .select("id, titulo, completed_at, status")
        .eq("user_id", userData.id)
        .in("status", ["finalizado", "arquivado", "concluído", "concluido"])
        .order("created_at", { ascending: false });

      if (!projs?.length) { setStorageProjects([]); return; }

      const projectIds = projs.map((p: any) => p.id);
      const { data: files } = await supabase
        .from("arquivos_projeto")
        .select("id, nome, url, created_at, projeto_id")
        .in("projeto_id", projectIds)
        .order("created_at", { ascending: false });

      const grouped: StorageProject[] = projs
        .map((p: any) => ({
          id: p.id,
          titulo: p.titulo,
          completed_at: p.completed_at,
          status: p.status,
          files: (files ?? []).filter((f: any) => f.projeto_id === p.id),
        }))
        .filter((p: StorageProject) => p.files.length > 0);

      setStorageProjects(grouped);
    } finally {
      setStorageLoading(false);
    }
  }

  async function handleDeleteFile(file: StorageFile) {
    setDeletingFileId(file.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/storage/delete-file", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ file_id: file.id, url: file.url }),
      });
      if (res.ok) {
        setStorageProjects((prev) =>
          prev
            .map((p) => ({ ...p, files: p.files.filter((f) => f.id !== file.id) }))
            .filter((p) => p.files.length > 0)
        );
        showToast("success", "Arquivo excluído com sucesso.");
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (s2) {
          const ur = await fetch("/api/subscription/storage-usage", {
            headers: { Authorization: `Bearer ${s2.access_token}` },
          });
          if (ur.ok) {
            const u = await ur.json();
            setStorageUsage({ usedGB: u.usedGB, limitGB: u.limitGB });
          }
        }
      } else {
        showToast("error", "Erro ao excluir arquivo.");
      }
    } finally {
      setDeletingFileId(null);
    }
  }

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (!profileDirty || url === router.asPath) return;
      setShowLeaveModal(true);
      setPendingRoute(url);
      router.events.emit("routeChangeError");
      throw "routeChange aborted by FlowDesk settings page";
    };
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => router.events.off("routeChangeStart", handleRouteChangeStart);
  }, [profileDirty, router]);

  function showToast(type: ToastType, message: string) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ open: true, type, message });
    toastRef.current = setTimeout(() => setToast((p) => ({ ...p, open: false })), 4000);
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function formatCpfCnpj(value: string): string {
    const d = value.replace(/\D/g, "");
    if (d.length <= 11) {
      const s = d.slice(0, 11);
      const a = s.slice(0, 3), b = s.slice(3, 6), c = s.slice(6, 9), e = s.slice(9, 11);
      if (s.length <= 3) return a;
      if (s.length <= 6) return `${a}.${b}`;
      if (s.length <= 9) return `${a}.${b}.${c}`;
      return `${a}.${b}.${c}-${e}`;
    }
    const s = d.slice(0, 14);
    const a = s.slice(0, 2), b = s.slice(2, 5), c = s.slice(5, 8), x = s.slice(8, 12), e = s.slice(12, 14);
    if (s.length <= 2) return a;
    if (s.length <= 5) return `${a}.${b}`;
    if (s.length <= 8) return `${a}.${b}.${c}`;
    if (s.length <= 12) return `${a}.${b}.${c}/${x}`;
    return `${a}.${b}.${c}/${x}-${e}`;
  }

  function formatPixPhone(value: string, pais: string): string {
    const d = value.replace(/\D/g, "");
    if (pais === "55") {
      const s = d.slice(0, 11);
      const ddd = s.slice(0, 2), n1 = s.slice(2, 7), n2 = s.slice(7, 11);
      if (s.length <= 2) return s.length ? `(${ddd}` : "";
      if (s.length <= 6) return `(${ddd}) ${n1}`;
      if (s.length <= 7) return `(${ddd}) ${s.slice(2, 7)}`;
      return `(${ddd}) ${n1}-${n2}`;
    }
    if (pais === "1") {
      const s = d.slice(0, 10);
      const a = s.slice(0, 3), b = s.slice(3, 6), c = s.slice(6, 10);
      if (s.length <= 3) return s.length ? `(${a}` : "";
      if (s.length <= 6) return `(${a}) ${b}`;
      return `(${a}) ${b}-${c}`;
    }
    if (pais === "351") {
      const s = d.slice(0, 9);
      const a = s.slice(0, 3), b = s.slice(3, 6), c = s.slice(6, 9);
      if (s.length <= 3) return a;
      if (s.length <= 6) return `${a} ${b}`;
      return `${a} ${b} ${c}`;
    }
    return d.slice(0, 15);
  }

  function pixPhonePlaceholder(pais: string): string {
    if (pais === "55") return "(11) 99999-9999";
    if (pais === "1") return "(555) 555-5555";
    if (pais === "351") return "912 345 678";
    return "999999999";
  }

  function pixPhoneMaxLen(pais: string): number {
    if (pais === "55") return 16;
    if (pais === "1") return 14;
    if (pais === "351") return 11;
    return 15;
  }

  const PAISES_PIX = [
    { code: "55",  flag: "🇧🇷", label: "Brasil",   dial: "+55" },
    { code: "1",   flag: "🇺🇸", label: "EUA",      dial: "+1" },
    { code: "351", flag: "🇵🇹", label: "Portugal", dial: "+351" },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pixPaisRef.current && !pixPaisRef.current.contains(e.target as Node)) {
        setPixPaisOpen(false);
      }
    }
    if (pixPaisOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pixPaisOpen]);

  async function doAvatarUpload(file: File) {
    if (!userData) return;
    try {
      const filePath = `avatars/${userData.id}_${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (error) { showToast("error", "Erro ao enviar imagem: " + error.message); return; }
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setProfileDirty(true);
      showToast("success", "Foto atualizada — clique em salvar para confirmar.");
    } catch (err: any) {
      showToast("error", "Erro ao enviar imagem: " + err.message);
    }
  }

  function handleAvatarSelected(file: File) {
    setShowAvatarPicker(false);
    triggerConverter(file, IMAGE_SPECS.avatar, doAvatarUpload);
  }

  async function salvarPerfil() {
    if (!userData) return;
    try {
      setSaving(true);
      const updates: any = { data: { nome, telefone, avatar_url: avatarUrl, pix_chave_tipo: pixTipo || null, pix_chave_valor: pixValor || null, pix_chave_pais: pixTipo === "telefone" ? pixPaisCode : null } };
      if (email && email !== userData.email) updates.email = email;
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      setUserData((prev: any) =>
        prev
          ? {
              ...prev,
              email: updates.email || prev.email,
              user_metadata: { ...(prev.user_metadata || {}), nome, telefone, avatar_url: avatarUrl, pix_chave_tipo: pixTipo || null, pix_chave_valor: pixValor || null, pix_chave_pais: pixTipo === "telefone" ? pixPaisCode : null },
            }
          : prev
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("flowdesk:user-updated", { detail: { nome, telefone, avatar_url: avatarUrl, email } })
        );
      }

      setProfileDirty(false);
      showToast("success", "Perfil salvo com sucesso.");
    } catch (err: any) {
      showToast("error", "Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleThemeChange(slug: ThemeSlug) {
    setTheme(slug);
    applyTheme(slug);
    window.dispatchEvent(new Event("flowdesk:theme-updated"));
    showToast("success", "Tema aplicado.");
  }

  function handleSidebarToggle(val: boolean) {
    setSidebarDefault(val);
    localStorage.setItem("sidebar_open", String(val));
    window.dispatchEvent(new CustomEvent("flowdesk:sidebar-default-changed", { detail: val }));
  }

  function handleProjetosView(v: ViewMode) {
    setProjetosView(v);
    localStorage.setItem("projetosViewMode", v);
  }
  function handleTarefasView(v: ViewMode) {
    setTarefasView(v);
    localStorage.setItem("tarefasViewMode", v);
  }
  function handleBriefingsView(v: ViewMode) {
    setBriefingsView(v);
    localStorage.setItem("briefingsViewMode", v);
  }
  function handlePropostasView(v: ViewMode) {
    setPropostasView(v);
    localStorage.setItem("proposalsViewMode", v);
  }
  function handleClientesView(v: ViewMode) {
    setClientesView(v);
    localStorage.setItem("clientesParams", JSON.stringify({ viewMode: v }));
  }

  async function atualizarSenha() {
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
    if (getUserError || !data?.user?.email) {
      showToast("error", "Não foi possível validar o usuário.");
      return;
    }

    try {
      setChangingPassword(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: senhaAtual,
      });
      if (signInError) { showToast("error", "Senha atual incorreta."); return; }

      const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });
      if (updateError) { showToast("error", "Erro ao atualizar senha: " + updateError.message); return; }

      setSenhaAtual(""); setNovaSenha(""); setConfirmarNovaSenha("");
      setShowPasswordModal(false);
      showToast("success", "Senha atualizada com sucesso.");
    } catch (err: any) {
      showToast("error", "Erro: " + err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  function confirmarSaida() {
    setShowLeaveModal(false);
    setProfileDirty(false);
    if (pendingRoute) { const t = pendingRoute; setPendingRoute(null); router.push(t); }
  }

  async function startCheckout(plan: "essencial" | "profissional") {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, period: billingPeriod }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else showToast("error", "Erro ao iniciar checkout. Tente novamente.");
    } catch {
      showToast("error", "Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function openPortal() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.url) window.open(json.url, "_blank");
      else showToast("error", "Erro ao abrir portal. Tente novamente.");
    } catch {
      showToast("error", "Erro ao abrir portal. Tente novamente.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function cancelSubscription() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowCancelModal(false);
        showToast("success", "Assinatura cancelada. Você mantém o acesso até o fim do período.");
        await subscription.refresh();
      } else {
        const json = await res.json();
        showToast("error", json.error || "Erro ao cancelar. Tente novamente.");
      }
    } catch {
      showToast("error", "Erro ao cancelar. Tente novamente.");
    } finally {
      setCancelLoading(false);
    }
  }

  async function reactivateSubscription() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setReactivateLoading(true);
    try {
      const res = await fetch("/api/stripe/reactivate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("success", "Assinatura reativada com sucesso.");
        await subscription.refresh();
      } else {
        const json = await res.json();
        showToast("error", json.error || "Erro ao reativar. Tente novamente.");
      }
    } catch {
      showToast("error", "Erro ao reativar. Tente novamente.");
    } finally {
      setReactivateLoading(false);
    }
  }

  async function addStorage() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setCheckoutLoading("storage");
    try {
      const res = await fetch("/api/stripe/add-storage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else showToast("error", "Erro ao adicionar storage. Tente novamente.");
    } catch {
      showToast("error", "Erro ao adicionar storage. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-gray-100">
        Carregando...
      </div>
    );
  }

  return (
    <>

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto overflow-x-hidden lg:overflow-hidden">

        <aside className="w-full lg:w-[296px] bg-primary-900 flex flex-col py-4 px-4 sm:py-5 sm:px-5 lg:py-[34px] lg:px-[22px] gap-4 lg:gap-[30px] shrink-0 sticky top-0 z-10 lg:static lg:z-auto">
          <div className="flex items-start gap-[14px] px-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="grid place-items-center w-[34px] h-[34px] shrink-0 rounded-[10px] border border-gray-700 text-gray-300 hover:border-primary-500 hover:text-primary-300 transition-all"
              style={{ background: "color-mix(in srgb, var(--primary-500) 6%, transparent)" }}
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-[22px] sm:text-[25px] font-bold text-gray-100 tracking-tight leading-none">Configurações</h1>
              <p className="text-[13px] sm:text-[14px] text-gray-400 mt-[3px]">Conta e preferências</p>
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible flex-nowrap lg:flex-wrap -mx-1 px-1 lg:mx-0 lg:px-0">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={clsx(
                  "flex items-center gap-[10px] lg:gap-[14px] h-[42px] lg:h-[50px] px-3 lg:px-4 text-[14px] lg:text-[16px] rounded-[12px] lg:rounded-[13px] transition-all text-left shrink-0 lg:w-full whitespace-nowrap",
                  section === id
                    ? "text-gray-100 font-semibold"
                    : "text-gray-300 font-medium hover:text-gray-100"
                )}
                style={section === id
                  ? { background: "color-mix(in srgb, var(--primary-500) 12%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--primary-500) 28%, transparent)" }
                  : undefined}
                onMouseEnter={section !== id ? (e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--gray-300) 7%, transparent)"; } : undefined}
                onMouseLeave={section !== id ? (e) => { (e.currentTarget as HTMLElement).style.background = ""; } : undefined}
              >
                <Icon
                  size={20}
                  className={clsx("shrink-0 transition-colors", section === id ? "text-primary-400" : "text-gray-400")}
                />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 lg:overflow-y-auto custom-scrollbar py-6 px-4 sm:px-6 lg:py-10 lg:px-12 bg-primary-800 rounded-none lg:rounded-tl-[22px] lg:rounded-bl-[22px] border-t lg:border-t-0 lg:border-l border-primary-700">

          {section === "perfil" && (
            <div className="flex flex-col gap-[22px]">
              <SectionHeader
                title="Perfil"
                description="Informações exibidas no FlowDesk e nos recursos de colaboração."
              />

              <Card title="Foto de perfil" desc={IMAGE_SPECS.avatar.hint}>
                <div className="flex items-center gap-[26px]">
                  <UserAvatar src={avatarUrl} name={nome || null} size={96} className="!w-24 !h-24 border-2 border-gray-700 shrink-0" />
                  <div className="flex flex-col gap-[10px]">
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(true)}
                      className="cfg-btn-impl inline-flex items-center gap-[9px] h-[46px] px-5 text-[15px] font-semibold text-gray-100 rounded-[12px] border border-gray-600 hover:border-primary-500 hover:text-primary-200 transition-all whitespace-nowrap"
                    >
                      Trocar foto
                    </button>
                    <span className="text-[13.5px] text-gray-500">Recomendado: imagem quadrada nítida.</span>
                  </div>
                </div>
              </Card>

              <Card title="Informações pessoais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Nome completo">
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => { setNome(e.target.value); setProfileDirty(true); }}
                      className="h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                      placeholder="Seu nome"
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setProfileDirty(true); }}
                      className="h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                      placeholder="seu@email.com"
                    />
                  </Field>

                  <Field label="Telefone">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-[9px] h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-4 text-[16px] text-gray-100 font-medium shrink-0">
                        <span className="text-[18px] leading-none">🇧🇷</span>
                        <span>+55</span>
                      </div>
                      <input
                        type="tel"
                        value={telefone}
                        onChange={(e) => { setTelefone(formatPhone(e.target.value)); setProfileDirty(true); }}
                        className="flex-1 h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </Field>
                </div>
              </Card>

              <Card title="Chave PIX para recebimento" icon={QrCode} desc="Pré-preenchida automaticamente ao solicitar adiantamentos ao cliente.">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Tipo de chave">
                    <div className="relative">
                      <select
                        value={pixTipo}
                        onChange={(e) => { setPixTipo(e.target.value as PixTipo); setPixValor(""); setProfileDirty(true); }}
                        className="w-full h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 appearance-none focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                      >
                        <option value="">Selecione o tipo de chave</option>
                        <option value="email">E-mail</option>
                        <option value="telefone">Telefone</option>
                        <option value="cpf_cnpj">CPF / CNPJ</option>
                        <option value="aleatoria">Chave aleatória</option>
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">▼</span>
                    </div>
                  </Field>

                  {pixTipo === "email" && (
                    <Field label="E-mail da chave PIX">
                      <input
                        type="email"
                        value={pixValor}
                        onChange={(e) => { setPixValor(e.target.value); setProfileDirty(true); }}
                        placeholder="seupix@email.com"
                        className="h-[54px] w-full bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                      />
                    </Field>
                  )}

                  {pixTipo === "telefone" && (
                    <Field label="Telefone da chave PIX">
                      <div className="flex gap-3">
                        <div ref={pixPaisRef} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setPixPaisOpen((o) => !o)}
                            className="flex items-center gap-2 h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-4 text-[16px] text-gray-100 hover:border-gray-500 focus:outline-none focus:border-primary-400 transition-colors"
                          >
                            <span className="text-[18px] leading-none">
                              {PAISES_PIX.find((p) => p.code === pixPaisCode)?.flag}
                            </span>
                            <span className="text-gray-400 text-[14px]">
                              {PAISES_PIX.find((p) => p.code === pixPaisCode)?.dial}
                            </span>
                            <span className="text-gray-600 text-[10px]">▼</span>
                          </button>

                          {pixPaisOpen && (
                            <div className="absolute top-full left-0 mt-1.5 z-50 bg-primary-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                              {PAISES_PIX.map((p) => (
                                <button
                                  key={p.code}
                                  type="button"
                                  onClick={() => {
                                    setPixPaisCode(p.code);
                                    setPixValor("");
                                    setPixPaisOpen(false);
                                    setProfileDirty(true);
                                  }}
                                  className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-left hover:bg-primary-700 transition-colors",
                                    p.code === pixPaisCode ? "text-primary-300" : "text-gray-200"
                                  )}
                                  style={p.code === pixPaisCode ? { background: "color-mix(in srgb, var(--primary-700) 50%, transparent)" } : undefined}
                                >
                                  <span className="text-[20px] leading-none">{p.flag}</span>
                                  <span className="flex-1">{p.label}</span>
                                  <span className="text-gray-500 text-[13px]">{p.dial}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          type="tel"
                          value={pixValor}
                          onChange={(e) => { setPixValor(formatPixPhone(e.target.value, pixPaisCode)); setProfileDirty(true); }}
                          placeholder={pixPhonePlaceholder(pixPaisCode)}
                          maxLength={pixPhoneMaxLen(pixPaisCode)}
                          className="flex-1 h-[54px] bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                        />
                      </div>
                    </Field>
                  )}

                  {pixTipo === "cpf_cnpj" && (
                    <Field label="CPF ou CNPJ">
                      <input
                        type="text"
                        value={pixValor}
                        onChange={(e) => { setPixValor(formatCpfCnpj(e.target.value)); setProfileDirty(true); }}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        maxLength={18}
                        className="h-[54px] w-full bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                      />
                    </Field>
                  )}

                  {pixTipo === "aleatoria" && (
                    <Field label="Chave aleatória">
                      <input
                        type="text"
                        value={pixValor}
                        onChange={(e) => { setPixValor(e.target.value); setProfileDirty(true); }}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="h-[54px] w-full bg-primary-900 border border-gray-700 rounded-[13px] px-[18px] text-[16px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-400 hover:border-gray-500 transition-colors"
                      />
                    </Field>
                  )}

                  </div>

                  {pixTipo && pixValor && (
                    <div className="flex items-center gap-3 mt-1 px-[18px] py-4 rounded-[13px]" style={{ border: "1px solid color-mix(in srgb, var(--primary-500) 24%, transparent)", background: "color-mix(in srgb, var(--primary-500) 6%, transparent)" }}>
                      <QrCode size={18} className="text-primary-400 shrink-0" />
                      <span className="text-[15.5px] text-primary-200 font-semibold truncate flex-1">{pixValor}</span>
                      <span className="text-[12.5px] font-semibold text-primary-300 px-[11px] py-1 rounded-full shrink-0" style={{ background: "color-mix(in srgb, var(--primary-500) 12%, transparent)" }}>Chave ativa</span>
                    </div>
                  )}
                </div>
              </Card>

              {profileDirty && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={salvarPerfil}
                    disabled={saving}
                    className={clsx(
                      "inline-flex items-center gap-[9px] h-[46px] px-6 text-[15px] font-semibold rounded-[12px] border-0 transition-all",
                      saving ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-px",
                    )}
                    style={{
                      background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)",
                      color: "var(--primary-900)",
                      boxShadow: "0 10px 24px -12px rgba(30,182,232,0.8)"
                    }}
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar alterações"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {section === "aparencia" && (
            <div className="flex flex-col gap-[22px]">
              <SectionHeader
                title="Aparência"
                description="Escolha o tema visual e configure o comportamento da interface."
              />

              <Card title="Tema" desc="Personalize as cores da interface. A mudança é aplicada imediatamente.">
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                  {THEMES.map((t) => {
                    const selected = theme === t.slug;
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => handleThemeChange(t.slug)}
                        className={clsx(
                          "relative flex flex-col gap-3 p-3 rounded-[15px] border transition-all",
                          selected
                            ? "border-primary-500"
                            : "border-gray-700 hover:border-gray-500 hover:-translate-y-0.5"
                        )}
                        style={selected ? {
                          background: "color-mix(in srgb, var(--primary-900) 30%, transparent)",
                          boxShadow: "0 0 0 1px var(--primary-500), 0 10px 26px -14px color-mix(in srgb, var(--primary-500) 60%, transparent)"
                        } : {
                          background: "color-mix(in srgb, var(--primary-900) 30%, transparent)"
                        }}
                      >
                        <div
                          className="relative flex flex-col justify-center gap-[7px] h-[76px] px-4 rounded-[10px]"
                          style={{ backgroundColor: t.previewBg }}
                        >
                          {t.bars.map((c, i) => (
                            <div
                              key={i}
                              className="h-[6px] rounded-[3px]"
                              style={{ backgroundColor: c, width: i === 0 ? "100%" : i === 1 ? "88%" : "70%" }}
                            />
                          ))}
                          {selected && (
                            <div className="absolute top-2 right-2 grid place-items-center w-[22px] h-[22px] bg-primary-500 rounded-full">
                              <Check size={13} className="text-primary-900" strokeWidth={2.6} />
                            </div>
                          )}
                        </div>
                        <span className="text-center text-[14.5px] font-semibold text-gray-200">
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card title="Interface">
                <PrefRow
                  label="Sidebar aberta ao entrar"
                  description="Mantém o menu lateral visível por padrão ao acessar o dashboard."
                >
                  <Toggle value={sidebarDefault} onChange={handleSidebarToggle} />
                </PrefRow>

                <PrefRow
                  label="Tour de boas-vindas"
                  description="Rever o tutorial guiado que apresenta as funcionalidades do FlowDesk."
                >
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("flowdesk:start-tour"))}
                    className="cfg-btn-impl inline-flex items-center gap-[9px] h-[46px] px-5 text-[15px] font-semibold text-gray-100 rounded-[12px] border border-gray-600 hover:border-primary-500 hover:text-primary-200 transition-all whitespace-nowrap"
                  >
                    Ver tutorial
                  </button>
                </PrefRow>

                <PrefRow
                  label="Mini-tutoriais por tela"
                  description="Reativar os mini-tutoriais que aparecem na primeira visita de cada seção."
                  last
                >
                  <button
                    type="button"
                    onClick={() => {
                      const keys = Object.keys(localStorage).filter(
                        (k) => k.startsWith("fd_page_tour_") || k === "fd_page_tours_off"
                      );
                      keys.forEach((k) => localStorage.removeItem(k));
                      window.location.reload();
                    }}
                    className="cfg-btn-impl inline-flex items-center gap-[9px] h-[46px] px-5 text-[15px] font-semibold text-gray-100 rounded-[12px] border border-gray-600 hover:border-primary-500 hover:text-primary-200 transition-all whitespace-nowrap"
                  >
                    Redefinir todos
                  </button>
                </PrefRow>
              </Card>
            </div>
          )}

          {section === "exibicao" && (
            <div className="flex flex-col gap-[22px]">
              <SectionHeader
                title="Exibição"
                description="Defina como cada módulo exibe seus dados por padrão. As preferências são salvas automaticamente."
              />

              <Card title="Modo de visualização por módulo" desc="Escolha se cada seção abre em lista ou em quadros por padrão. Você pode trocar a qualquer momento dentro da própria tela.">
                <PrefRow
                  label="Projetos"
                  description="Modo padrão ao abrir a lista de projetos."
                >
                  <ViewModeToggle value={projetosView} onChange={handleProjetosView} />
                </PrefRow>

                <PrefRow
                  label="Tarefas"
                  description="Modo padrão na visualização geral de tarefas."
                >
                  <ViewModeToggle value={tarefasView} onChange={handleTarefasView} />
                </PrefRow>

                <PrefRow
                  label="Briefings"
                  description="Modo padrão ao abrir a lista de briefings."
                >
                  <ViewModeToggle value={briefingsView} onChange={handleBriefingsView} />
                </PrefRow>

                <PrefRow
                  label="Propostas"
                  description="Modo padrão ao abrir a lista de propostas."
                >
                  <ViewModeToggle value={propostasView} onChange={handlePropostasView} />
                </PrefRow>

                <PrefRow
                  label="Clientes"
                  description="Modo padrão ao abrir a lista de clientes."
                  last
                >
                  <ViewModeToggle value={clientesView} onChange={handleClientesView} />
                </PrefRow>
              </Card>
            </div>
          )}

          {section === "seguranca" && (
            <div className="flex flex-col gap-[22px]">
              <SectionHeader
                title="Segurança"
                description="Gerencie o acesso e a proteção da sua conta."
              />

              <Card title="Acesso à conta">
                <PrefRow label="Email de acesso" description="Usado para login e recuperação de conta.">
                  <span className="text-[15.5px] font-medium text-gray-200 shrink-0">{email || "—"}</span>
                </PrefRow>

                <PrefRow
                  label="Senha"
                  description="Atualize sua senha periodicamente para manter a conta segura."
                  last
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSenhaAtual(""); setNovaSenha(""); setConfirmarNovaSenha("");
                      setShowPasswordModal(true);
                    }}
                    className="cfg-btn-impl inline-flex items-center gap-[9px] h-[46px] px-5 text-[15px] font-semibold text-gray-100 rounded-[12px] border border-gray-600 hover:border-primary-500 hover:text-primary-200 transition-all whitespace-nowrap"
                  >
                    Trocar senha
                  </button>
                </PrefRow>
              </Card>

              <Card title="Boas práticas de segurança">
                <ul className="flex flex-col gap-[14px]">
                  {[
                    "Use ao menos 8 caracteres na senha.",
                    "Combine letras maiúsculas, minúsculas, números e símbolos.",
                    "Evite reutilizar senhas de outros serviços.",
                    "Nunca compartilhe sua senha com terceiros.",
                  ].map((tip) => (
                    <li key={tip} className="relative pl-[22px] text-[15px] text-gray-300 list-none">
                      <span className="absolute left-1 top-2 w-[6px] h-[6px] rounded-full bg-primary-400 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {section === "assinatura" && (
            <div className="flex flex-col gap-[22px]">
              <SectionHeader
                title="Assinatura"
                description="Gerencie seu plano, faturamento e recursos disponíveis."
              />

              {!subscription.loading && (
                <div
                  className="border border-gray-700 rounded-[18px] p-4 sm:p-7"
                  style={{ background: "color-mix(in srgb, var(--primary-800) 34%, transparent)" }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-flex items-center gap-1.5 px-[14px] py-[7px] rounded-full text-[14.5px] font-bold text-primary-200"
                          style={{ background: "color-mix(in srgb, var(--primary-500) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-500) 28%, transparent)" }}
                        >
                          <Zap size={15} className="text-primary-400" />
                          {subscription.plan === "trial" ? "Trial — Profissional" : subscription.plan === "profissional" ? "Profissional" : "Essencial"}
                        </span>
                        {subscription.status === "active" && (
                          <span className="text-[11px] text-green-400">Ativo</span>
                        )}
                        {subscription.status === "trialing" && (
                          <span className="text-[11px] text-amber-400">Trial ativo</span>
                        )}
                      </div>
                      {subscription.isTrialActive && subscription.trialEnd && (() => {
                        const daysLeft = Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const progress = Math.max(0, Math.min(100, (daysLeft / TRIAL_DAYS) * 100));
                        return (
                          <div className="mt-1">
                            <p className="text-[13px] text-gray-400 mb-2">
                              <span className="text-amber-300 font-semibold">{daysLeft} {daysLeft === 1 ? "dia" : "dias"} restantes</span>
                              {" "}de teste grátis — expira em{" "}
                              <span className="text-gray-200 font-medium">
                                {new Date(subscription.trialEnd).toLocaleDateString("pt-BR")}
                              </span>
                            </p>
                            <div className="w-full h-1.5 bg-primary-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                      {subscription.isLifetime && (
                        <p className="text-[13px] text-green-400 font-medium">Acesso permanente</p>
                      )}
                      {!subscription.isLifetime && !subscription.isTrialActive && subscription.currentPeriodEnd && (
                        <p className="text-[13px] text-gray-400">
                          {subscription.cancelAtPeriodEnd ? "Cancela em" : "Renova em"}{" "}
                          <span className="text-gray-200 font-medium">
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                          </span>
                        </p>
                      )}
                      {!subscription.isLifetime && !subscription.isTrialActive && !subscription.currentPeriodEnd && (
                        <p className="text-[13px] text-gray-400">Plano Essencial — sem assinatura ativa.</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {subscription.hasStripeSubscription && (
                        <button
                          type="button"
                          onClick={openPortal}
                          disabled={portalLoading}
                          className="cfg-btn-impl inline-flex items-center gap-[9px] h-[46px] px-5 text-[15px] font-semibold text-gray-100 rounded-[12px] border border-gray-600 hover:border-primary-500 hover:text-primary-200 transition-all whitespace-nowrap"
                        >
                          <ExternalLink size={16} />
                          {portalLoading ? "Abrindo..." : "Gerenciar faturamento"}
                        </button>
                      )}
                      {subscription.hasStripeSubscription && !subscription.isLifetime && !subscription.isTrialActive && (
                        subscription.cancelAtPeriodEnd ? (
                          <button
                            type="button"
                            onClick={reactivateSubscription}
                            disabled={reactivateLoading}
                            className="text-[12px] text-primary-300 hover:text-primary-200 transition-colors disabled:opacity-60"
                          >
                            {reactivateLoading ? "Reativando..." : "Reativar assinatura"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowCancelModal(true)}
                            className="text-[12px] text-red-400 hover:text-red-300 transition-colors"
                          >
                            Cancelar assinatura
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-[14px]">
                    {[
                      {
                        label: "Projetos",
                        value: subscription.limits.projetos === null ? "Ilimitado" : `${subscription.limits.projetos} projetos`,
                      },
                      {
                        label: "Clientes",
                        value: subscription.limits.clientes === null ? "Ilimitado" : `${subscription.limits.clientes} clientes`,
                      },
                      {
                        label: "Storage",
                        value: `${subscription.limits.storageGB} GB`,
                      },
                      {
                        label: "Co-working",
                        value: subscription.limits.coworkingMembros === null
                          ? "Ilimitado"
                          : subscription.limits.coworkingMembros === 0
                            ? "Não incluso"
                            : `${subscription.limits.coworkingMembros} membros`,
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col gap-[7px] bg-primary-900 border border-gray-700 rounded-[13px] p-4">
                        <p className="text-[13.5px] text-gray-400">{item.label}</p>
                        <p className="text-[18px] font-bold text-gray-100">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center items-center gap-2">
                <div className="inline-flex items-center p-1 rounded-full border border-gray-700 bg-primary-900">
                  {(["mensal", "anual"] as BillingPeriod[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBillingPeriod(p)}
                      className={clsx(
                        "px-[26px] py-[11px] rounded-full text-[15px] font-semibold transition-all capitalize",
                        billingPeriod === p
                          ? "bg-gradient-to-br from-primary-300 to-primary-500 text-primary-900"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                    >
                      {p === "mensal" ? "Mensal" : "Anual"}
                    </button>
                  ))}
                </div>
                {billingPeriod === "anual" && (
                  <span className="ml-3 self-center text-[13px] text-green-400 font-medium">20% de desconto</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="flex flex-col p-7 rounded-[18px] border border-gray-700"
                  style={{ background: "color-mix(in srgb, var(--primary-800) 34%, transparent)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-5">
                    <div>
                      <h3 className="text-[19px] font-bold text-gray-100 tracking-tight">Essencial</h3>
                      <p className="text-[13.5px] text-gray-400 mt-[3px]">Para quem está começando</p>
                    </div>
                    {isCurrentPlan("essencial") && (
                      <span className="inline-flex items-center gap-1.5 px-[10px] py-[5px] text-[12px] font-semibold text-primary-300 rounded-full shrink-0" style={{ background: "color-mix(in srgb, var(--primary-500) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-500) 24%, transparent)" }}>
                        <Check size={11} strokeWidth={2.5} />
                        Plano atual
                      </span>
                    )}
                  </div>

                  <div className="mb-5">
                    <div className="flex items-end gap-1 leading-none">
                      <span className="text-[14px] font-semibold text-gray-400 mb-[9px]">R$</span>
                      <span className="text-[40px] font-bold text-gray-100 tracking-tight leading-none">
                        {billingPeriod === "mensal"
                          ? PLAN_PRICES.essencial.mensal.toFixed(2).replace(".", ",")
                          : (PLAN_PRICES.essencial.anual / 12).toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-[14px] text-gray-400 mb-[9px] ml-[2px]">/mês</span>
                    </div>
                    {billingPeriod === "anual" && (
                      <p className="text-[12.5px] text-gray-500 mt-1">
                        R$ {PLAN_PRICES.essencial.anual.toFixed(2).replace(".", ",")} cobrado anualmente
                      </p>
                    )}
                  </div>

                  <ul className="flex flex-col gap-[13px] mb-7">
                    {[
                      "10 projetos ativos",
                      "10 clientes",
                      "5 GB de armazenamento",
                      "1 colaborador por projeto",
                      "Portal do cliente básico",
                      "Propostas ilimitadas",
                      "Time tracker e briefings",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-[10px] text-[15px] text-gray-200">
                        <Check size={15} className="text-primary-400 shrink-0" strokeWidth={2.5} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    {isCurrentPlan("essencial") ? (
                      <div className="w-full h-[52px] flex items-center justify-center rounded-[13px] border border-gray-700 text-[16px] font-semibold text-gray-500 cfg-plan-current-btn">
                        Plano atual
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startCheckout("essencial")}
                        disabled={checkoutLoading === "essencial"}
                        className="cfg-btn-impl w-full h-[52px] rounded-[13px] border border-gray-600 text-[16px] font-semibold text-gray-100 hover:border-primary-500 transition-all disabled:opacity-60"
                      >
                        {checkoutLoading === "essencial" ? "Aguarde..." : "Escolher Essencial"}
                      </button>
                    )}
                  </div>
                </div>

                {(() => {
                  const isProfissionalAtivo = isCurrentPlan("profissional");
                  return (
                    <div
                      className="relative flex flex-col p-7 rounded-[18px] border"
                      style={{
                        borderColor: "var(--primary-500)",
                        background: "linear-gradient(180deg, color-mix(in srgb, var(--primary-500) 7%, transparent), color-mix(in srgb, var(--primary-800) 34%, transparent))",
                        boxShadow: "0 0 0 1px rgba(30,182,232,0.4), 0 18px 50px -28px rgba(30,182,232,0.5)"
                      }}
                    >
                      {!isProfissionalAtivo && (
                        <div className="absolute -top-[14px] left-1/2 -translate-x-1/2">
                          <span
                            className="inline-flex items-center gap-[6px] px-[14px] py-[5px] text-[12px] font-bold rounded-full"
                            style={{
                              background: "linear-gradient(135deg, var(--primary-300), var(--primary-500))",
                              color: "var(--primary-900)"
                            }}
                          >
                            <Zap size={12} strokeWidth={2.5} />
                            RECOMENDADO
                          </span>
                        </div>
                      )}

                      <div className={clsx("flex items-start justify-between gap-2 mb-5", !isProfissionalAtivo && "mt-2")}>
                        <div>
                          <h3 className="text-[19px] font-bold text-gray-100 tracking-tight">Profissional</h3>
                          <p className="text-[13.5px] text-gray-400 mt-[3px]">Para freelancers ativos</p>
                        </div>
                        {isProfissionalAtivo && (
                          <span className="inline-flex items-center gap-1.5 px-[10px] py-[5px] text-[12px] font-semibold text-primary-300 rounded-full shrink-0" style={{ background: "color-mix(in srgb, var(--primary-500) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-500) 24%, transparent)" }}>
                            <Check size={11} strokeWidth={2.5} />
                            Plano atual
                          </span>
                        )}
                        {subscription.isTrialActive && (
                          <span className="text-[11px] text-amber-300 px-2 py-1 rounded-full shrink-0" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.30)" }}>Trial</span>
                        )}
                      </div>

                      <div className="mb-5">
                        <div className="flex items-end gap-1 leading-none">
                          <span className="text-[14px] font-semibold text-gray-400 mb-[9px]">R$</span>
                          <span className="text-[40px] font-bold text-gray-100 tracking-tight leading-none">
                            {billingPeriod === "mensal"
                              ? PLAN_PRICES.profissional.mensal.toFixed(2).replace(".", ",")
                              : (PLAN_PRICES.profissional.anual / 12).toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-[14px] text-gray-400 mb-[9px] ml-[2px]">/mês</span>
                        </div>
                        {billingPeriod === "anual" && (
                          <p className="text-[12.5px] text-gray-500 mt-1">
                            R$ {PLAN_PRICES.profissional.anual.toFixed(2).replace(".", ",")} cobrado anualmente
                          </p>
                        )}
                      </div>

                      <ul className="flex flex-col gap-[13px] mb-7">
                        {[
                          "Projetos ilimitados",
                          "Clientes ilimitados",
                          "20 GB de armazenamento",
                          "Até 5 colaboradores por projeto",
                          "Portal do cliente completo",
                          "Aprovação de demandas pelo cliente",
                          "Propostas ilimitadas",
                          "Relatórios completos",
                        ].map((f) => (
                          <li key={f} className="flex items-center gap-[10px] text-[15px] text-gray-200">
                            <Check size={15} className="text-primary-400 shrink-0" strokeWidth={2.5} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto">
                        {isProfissionalAtivo ? (
                          <div className="w-full h-[52px] flex items-center justify-center rounded-[13px] border border-gray-700 text-[16px] font-semibold text-gray-500 cfg-plan-current-btn">
                            Plano atual
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startCheckout("profissional")}
                            disabled={checkoutLoading === "profissional"}
                            className="w-full h-[52px] rounded-[13px] text-[16px] font-semibold transition-all disabled:opacity-60"
                            style={{
                              background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)",
                              color: "var(--primary-900)",
                              boxShadow: "0 10px 28px -10px rgba(30,182,232,0.6)"
                            }}
                          >
                            {checkoutLoading === "profissional"
                              ? "Aguarde..."
                              : subscription.isTrialActive
                                ? "Assinar Profissional"
                                : subscription.plan === "profissional"
                                  ? "Trocar para " + (billingPeriod === "anual" ? "anual" : "mensal")
                                  : "Fazer upgrade"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div
                className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 p-4 sm:p-7 rounded-[18px] border border-gray-700"
                style={{ background: "color-mix(in srgb, var(--primary-800) 34%, transparent)" }}
              >
                <div
                  className="w-[52px] h-[52px] rounded-[13px] flex items-center justify-center shrink-0"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--primary-500) 24%, transparent)",
                    background: "color-mix(in srgb, var(--primary-500) 7%, transparent)"
                  }}
                >
                  <HardDrive size={22} className="text-primary-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16.5px] font-semibold text-gray-100">
                    Armazenamento extra
                    {subscription.extraStorageAddons > 0 && (
                      <span className="ml-2 text-[13px] text-primary-300 font-normal">
                        +{subscription.extraStorageAddons * 5} GB adicionados
                      </span>
                    )}
                  </p>
                  <p className="text-[13.5px] text-gray-400 mt-[3px]">
                    +5 GB por R$ {PLAN_PRICES.storage_extra.toFixed(2).replace(".", ",")}/mês — acumula com quantas compras quiser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addStorage}
                  disabled={checkoutLoading === "storage"}
                  className="inline-flex items-center gap-[9px] h-[46px] px-5 text-[15px] font-semibold rounded-[12px] transition-all disabled:opacity-60 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)",
                    color: "var(--primary-900)",
                    boxShadow: "0 10px 24px -12px rgba(30,182,232,0.8)"
                  }}
                >
                  {checkoutLoading === "storage" ? "Aguarde..." : (
                    <>Adicionar <ChevronRight size={16} /></>
                  )}
                </button>
              </div>

              {!subscription.isTrialActive && !subscription.trialUsed && (
                <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <Zap size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-amber-200 leading-relaxed">
                    <span className="font-semibold">7 dias grátis</span> com acesso completo ao plano Profissional. Cancele a qualquer momento antes do trial terminar sem ser cobrado.
                  </p>
                </div>
              )}
            </div>
          )}

          {section === "armazenamento" && (
            <div className="flex flex-col gap-[22px]">
              <SectionHeader
                title="Armazenamento"
                description="Gerencie o espaço usado pelos seus projetos."
              />

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[18px] font-semibold text-gray-100">Uso de armazenamento</span>
                  {storageUsage && (
                    <span className="text-[15px] text-gray-400">
                      <span className="font-bold text-gray-100">
                        {storageUsage.usedGB < 1
                          ? `${(storageUsage.usedGB * 1024).toFixed(0)} MB`
                          : `${storageUsage.usedGB.toFixed(2)} GB`}
                      </span>
                      {" "}de {storageUsage.limitGB} GB
                    </span>
                  )}
                </div>
                <div className="h-3 rounded-full bg-primary-900 border border-gray-700 overflow-hidden">
                  {storageUsage && (
                    <div
                      className={`h-full min-w-[14px] rounded-full transition-all ${
                        storageUsage.usedGB / storageUsage.limitGB > 0.85
                          ? "bg-red-400"
                          : storageUsage.usedGB / storageUsage.limitGB > 0.6
                          ? "bg-amber-400"
                          : "bg-gradient-to-r from-primary-400 to-primary-500"
                      }`}
                      style={{ width: `${Math.min((storageUsage.usedGB / storageUsage.limitGB) * 100, 100)}%` }}
                    />
                  )}
                </div>
                {storageUsage && storageUsage.usedGB / storageUsage.limitGB > 0.85 && (
                  <p className="text-[12px] text-amber-400 mt-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    Armazenamento quase cheio. Exclua arquivos ou faça upgrade do plano.
                  </p>
                )}
                <div className="mt-5 flex flex-col gap-[11px]">
                  <div className="flex items-baseline gap-[10px] text-[14px] text-gray-400">
                    <span className="w-[9px] h-[9px] rounded-full bg-primary-400 shrink-0 translate-y-[1px]" />
                    <span><span className="font-semibold text-gray-200">Projetos ativos</span> — arquivos em uso, não podem ser excluídos aqui</span>
                  </div>
                  <div className="flex items-baseline gap-[10px] text-[14px] text-gray-400">
                    <span className="w-[9px] h-[9px] rounded-full bg-amber-400 shrink-0 translate-y-[1px]" />
                    <span><span className="font-semibold text-gray-200">Projetos finalizados / arquivados</span> — arquivos listados abaixo, podem ser excluídos para liberar espaço</span>
                  </div>
                </div>
              </Card>

              {storageLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-primary-800 animate-pulse" />
                  ))}
                </div>
              ) : storageProjects.length === 0 ? (
                <Card className="!p-0">
                  <div className="flex flex-col items-center gap-[14px] py-16 px-6 text-center">
                    <div
                      className="grid place-items-center w-16 h-16 rounded-[18px]"
                      style={{ background: "color-mix(in srgb, var(--primary-500) 7%, transparent)" }}
                    >
                      <HardDrive size={28} className="text-primary-400" />
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold text-gray-100">Nenhum arquivo para gerenciar</p>
                      <p className="text-[14.5px] text-gray-400 mt-2">
                        Arquivos de projetos finalizados aparecerão aqui.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {storageProjects.map((proj) => {
                    const completedAt = proj.completed_at ? new Date(proj.completed_at) : null;
                    const daysElapsed = completedAt ? Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const daysRemaining = Math.max(0, 30 - daysElapsed);
                    const isUrgent = completedAt && daysRemaining <= 7;

                    return (
                      <Card key={proj.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-700">
                          <div className="flex items-center gap-2">
                            <FolderOpen size={16} className="text-gray-500 shrink-0" />
                            <span className="text-[14px] font-medium text-gray-200">{proj.titulo}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${proj.status === "finalizado" ? "text-primary-300" : "bg-gray-700 text-gray-400"}`}
                              style={proj.status === "finalizado" ? { background: "color-mix(in srgb, var(--primary-700) 30%, transparent)" } : undefined}
                            >
                              {proj.status === "arquivado" ? "Arquivado" : proj.status === "finalizado" ? "Finalizado" : "Concluído"}
                            </span>
                          </div>
                          {completedAt && (
                            <span className={`text-[12px] font-medium flex items-center gap-1 ${
                              isUrgent ? "text-red-400" : daysRemaining <= 14 ? "text-amber-400" : "text-gray-500"
                            }`}>
                              {isUrgent && <AlertTriangle size={11} />}
                              {daysRemaining === 0
                                ? "Expira hoje"
                                : `${daysRemaining} dia${daysRemaining > 1 ? "s" : ""} restantes`}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          {proj.files.map((file) => {
                            const ext = file.nome.split(".").pop()?.toLowerCase() ?? "";
                            const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
                            const isPdf = ext === "pdf";
                            const isDeleting = deletingFileId === file.id;

                            return (
                              <div
                                key={file.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cfg-file-row"
                              >
                                {isPdf || !isImage ? (
                                  <FileText size={15} className="text-gray-500 shrink-0" />
                                ) : (
                                  <File size={15} className="text-gray-500 shrink-0" />
                                )}
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 text-[13px] text-gray-300 hover:text-primary-300 truncate transition-colors"
                                >
                                  {file.nome}
                                </a>
                                <span className="text-[11px] text-gray-600 shrink-0 hidden group-hover:inline">
                                  {ext.toUpperCase()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file)}
                                  disabled={isDeleting}
                                  className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                                  title="Excluir arquivo"
                                >
                                  {isDeleting ? (
                                    <span className="h-3.5 w-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin block" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <Modal
        open={showPasswordModal}
        title="Trocar senha"
        onClose={() => { if (!changingPassword) setShowPasswordModal(false); }}
        actions={
          <>
            <button
              type="button"
              onClick={() => { if (!changingPassword) setShowPasswordModal(false); }}
              disabled={changingPassword}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[14px] hover:bg-primary-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={atualizarSenha}
              disabled={changingPassword}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg px-5 py-2 text-[14px] font-semibold transition-colors"
            >
              {changingPassword ? "Atualizando..." : "Confirmar troca"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-[14px]">
            <span className="text-gray-400">Senha atual</span>
            <div className="relative">
              <input
                type={showSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full bg-primary-900 border border-gray-700 rounded-lg px-4 py-2.5 pr-12 text-gray-100 focus:outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={() => setShowSenhaAtual((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-200"
              >
                {showSenhaAtual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-[14px]">
            <span className="text-gray-400">Nova senha</span>
            <div className="relative">
              <input
                type={showNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-primary-900 border border-gray-700 rounded-lg px-4 py-2.5 pr-12 text-gray-100 focus:outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-200"
              >
                {showNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-[14px]">
            <span className="text-gray-400">Confirmar nova senha</span>
            <div className="relative">
              <input
                type={showConfirmar ? "text" : "password"}
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                className="w-full bg-primary-900 border border-gray-700 rounded-lg px-4 py-2.5 pr-12 text-gray-100 focus:outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmar((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-200"
              >
                {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCancelModal}
        title="Cancelar assinatura"
        onClose={() => setShowCancelModal(false)}
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[14px] hover:bg-primary-700"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={cancelSubscription}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-5 py-2 text-[14px] font-semibold disabled:opacity-60 transition-colors"
            >
              {cancelLoading ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </>
        }
      >
        <p className="text-[14px] text-gray-300 leading-relaxed">
          Sua assinatura continuará ativa até{" "}
          {subscription.currentPeriodEnd && (
            <span className="text-gray-100 font-medium">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </span>
          )}
          . Após essa data, o plano voltará automaticamente para o Essencial e você perderá acesso aos recursos premium.
        </p>
      </Modal>

      <Modal
        open={showLeaveModal}
        title="Descartar alterações?"
        onClose={() => { setShowLeaveModal(false); setPendingRoute(null); }}
        actions={
          <>
            <button
              type="button"
              onClick={() => { setShowLeaveModal(false); setPendingRoute(null); }}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg px-4 py-2 text-[14px] hover:bg-primary-700"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={confirmarSaida}
              className="bg-red-500 hover:bg-red-400 text-primary-50 rounded-lg px-5 py-2 text-[14px] font-semibold"
            >
              Descartar
            </button>
          </>
        }
      >
        <p className="text-[14px] text-gray-300 leading-relaxed">
          Você tem alterações de perfil não salvas. Deseja sair mesmo assim?
        </p>
      </Modal>

      {toast.open && (
        <div className="fixed bottom-6 right-6 z-[70] animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-start gap-3 bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 shadow-xl min-w-[260px] max-w-[360px]">
            <div className="mt-0.5 text-base leading-none shrink-0">
              {toast.type === "success" && <span className="text-green-400">✓</span>}
              {toast.type === "error" && <span className="text-red-400">✕</span>}
              {toast.type === "info" && <span className="text-primary-300">●</span>}
            </div>
            <p className="flex-1 text-[14px] text-primary-100 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast((p) => ({ ...p, open: false }))}
              className="text-gray-500 hover:text-gray-200 text-sm leading-none mt-0.5 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-600); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {showAvatarPicker && (
        <AvatarPickerModal
          onSelect={handleAvatarSelected}
          onClose={() => setShowAvatarPicker(false)}
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
    </>
  );
}
