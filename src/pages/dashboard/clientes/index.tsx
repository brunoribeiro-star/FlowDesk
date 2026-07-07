"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import HeaderProfile from "@/components/HeaderProfile";
import {
  getClientes,
  addCliente,
  deleteCliente,
  updateCliente,
  Cliente,
} from "@/lib/supabaseQueries/clientes";
import { supabase } from "@/lib/supabaseClient";
import { SkeletonList } from "@/components/Skeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { triggerUpgradeBanner } from "@/lib/limitGuard";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import {
  Pencil,
  Search,
  LayoutList,
  Kanban,
  Phone,
  Mail,
  Building2,
  Trash2,
  Calendar,
  Plus,
  User,
  MoreHorizontal,
  Check,
  CreditCard,
} from "lucide-react";
import Toast from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";

const CLIENTES_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo aos Clientes!", content: "Aqui você cadastra e organiza todos os seus clientes com informações de contato, empresa e foto de perfil." },
  { target: "#tour-add-btn", placement: "bottom", skipBeacon: true, title: "Adicionar cliente", content: "Clique aqui para cadastrar um novo cliente. Você pode informar nome, empresa, e-mail, telefone e foto." },
  { target: 'button[title="Quadros"]', placement: "bottom", skipBeacon: true, title: "Visualização em quadros", content: "Alterne para o modo quadro (kanban) e arraste os clientes entre colunas: Potencial, Em Negociação, Cliente e Inativo." },
  { target: "body", placement: "center", skipBeacon: true, title: "Dica: vincule clientes a projetos", content: "Ao criar ou editar um projeto, você pode associá-lo a um cliente cadastrado aqui. Isso facilita o acompanhamento de quem é cada trabalho." },
];

type ViewMode = "list" | "board";

const COUNTRIES = [
  { code: "BR", name: "Brasil",          dial: "+55",  flag: "🇧🇷", ph: "(00) 00000-0000",  maxDigits: 11 },
  { code: "US", name: "Estados Unidos",  dial: "+1",   flag: "🇺🇸", ph: "(000) 000-0000",   maxDigits: 10 },
  { code: "PT", name: "Portugal",        dial: "+351", flag: "🇵🇹", ph: "000 000 000",      maxDigits: 9  },
  { code: "AR", name: "Argentina",       dial: "+54",  flag: "🇦🇷", ph: "(000) 0000-0000",  maxDigits: 10 },
];

const PHONE_MASKS: Record<string, (v: string) => string> = {
  BR: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (!d) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  },
  US: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (!d) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  },
  PT: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 9);
    if (!d) return "";
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
    return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
  },
  AR: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (!d) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,7)}-${d.slice(7)}`;
  },
};

const TINTS = ["t1", "t2", "t3", "t4", "t5"];

function getAvatarTint(id: string): string {
  const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return TINTS[hash % TINTS.length];
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function ClientAvatar({ c, size }: { c: Cliente; size: number }) {
  const tint = getAvatarTint(c.id);
  const initials = getInitials(c.nome);
  const fontSize = Math.round(size * 0.36);

  if (c.foto_url) {
    return (
      <span className="cl-av" style={{ width: size, height: size, fontSize, overflow: "hidden" }}>
        <Image
          src={c.foto_url}
          alt={c.nome}
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </span>
    );
  }
  return (
    <span className={`cl-av ${tint}`} style={{ width: size, height: size, fontSize }}>
      {initials}
    </span>
  );
}

export default function ClientesPage() {
  const subscription = useSubscription();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const editingRef = useRef<Cliente | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const { converterState, triggerConverter, cancelConverter, setConverterState } = useImageConverter();
  const [clientStatusMap, setClientStatusMap] = useState<Record<string, string>>({});

  const [showNewModal, setShowNewModal] = useState(false);
  const [newLoading, setNewLoading] = useState(false);
  const [newFotoUrl, setNewFotoUrl] = useState<string | null>(null);
  const [newUploadingImage, setNewUploadingImage] = useState(false);
  const [newCountry, setNewCountry] = useState(COUNTRIES[0]);
  const [newForm, setNewForm] = useState({ nome: "", empresa: "", email: "", telefone: "", cpf_cnpj: "" });
  const [newErrors, setNewErrors] = useState({ email: "", telefone: "", cpf_cnpj: "" });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardStateInitialized = useRef(false);
  const viewModeInitialized = useRef(false);

  const boardColumns = [
    { id: "potencial",     label: "Potencial",      tone: "primary" },
    { id: "em_negociacao", label: "Em Negociação",  tone: "alert"   },
    { id: "cliente",       label: "Cliente",        tone: "success" },
    { id: "inativo",       label: "Inativo",        tone: "neutral" },
  ];

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => { editingRef.current = editing; }, [editing]);

  useEffect(() => {
    fetchClientes();

    const savedView = localStorage.getItem("clientesParams");
    if (savedView) {
      try {
        const parsed = JSON.parse(savedView);
        if (parsed.viewMode && (parsed.viewMode === "list" || parsed.viewMode === "board")) {
          setViewMode(parsed.viewMode);
        }
      } catch {}
    }

    const savedBoard = localStorage.getItem("clientesBoardState");
    if (savedBoard) {
      try {
        setClientStatusMap(JSON.parse(savedBoard));
      } catch {}
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-client-menu]")) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!viewModeInitialized.current) { viewModeInitialized.current = true; return; }
    localStorage.setItem("clientesParams", JSON.stringify({ viewMode }));
  }, [viewMode]);

  useEffect(() => {
    if (!boardStateInitialized.current) { boardStateInitialized.current = true; return; }
    localStorage.setItem("clientesBoardState", JSON.stringify(clientStatusMap));
  }, [clientStatusMap]);

  async function fetchClientes() {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (err: any) {
      showToast("Erro ao carregar clientes", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirmed(id: string) {
    try {
      await deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      showToast("Cliente excluído com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao excluir cliente", "error");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      nome: (formData.get("nome") as string) || "",
      empresa: (formData.get("empresa") as string) || null,
      email: (formData.get("email") as string) || null,
      telefone: (formData.get("telefone") as string) || null,
      foto_url: editing.foto_url,
    };

    try {
      const updated = await updateCliente(editing.id, updates);
      setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditing(null);
      showToast("Cliente atualizado com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao atualizar: " + (err.message || "Erro desconhecido"), "error");
    }
  }

  async function doImageUpload(file: File) {
    const currentEditing = editingRef.current;
    if (!currentEditing) return;
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const path = `clientes/${user.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditing(prev => prev ? { ...prev, foto_url: urlData.publicUrl } : null);
      showToast("Foto enviada com sucesso!", "success");
    } catch (error: any) {
      showToast("Erro ao enviar foto: " + error.message, "error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    triggerConverter(file, IMAGE_SPECS.avatar, doImageUpload);
    e.target.value = "";
  }

  function resetNewModal() {
    setNewForm({ nome: "", empresa: "", email: "", telefone: "", cpf_cnpj: "" });
    setNewErrors({ email: "", telefone: "", cpf_cnpj: "" });
    setNewFotoUrl(null);
    setNewCountry(COUNTRIES[0]);
    setNewLoading(false);
  }

  function openNewModal() {
    resetNewModal();
    setShowNewModal(true);
  }

  function closeNewModal() {
    setShowNewModal(false);
    resetNewModal();
  }

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

  const maskCpfCnpj = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      digits = digits.slice(0, 11);
      return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
    }
    digits = digits.slice(0, 14);
    return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };

  function handleNewCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = COUNTRIES.find(c => c.code === e.target.value);
    if (!selected) return;
    setNewCountry(selected);
    setNewForm(prev => ({ ...prev, telefone: "" }));
    setNewErrors(prev => ({ ...prev, telefone: "" }));
  }

  function handleNewChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === "email") {
      setNewErrors(prev => ({ ...prev, email: value && !validateEmail(value) ? "E-mail inválido" : "" }));
      setNewForm(prev => ({ ...prev, email: value }));
      return;
    }
    if (name === "cpf_cnpj") {
      const masked = maskCpfCnpj(value);
      setNewForm(prev => ({ ...prev, cpf_cnpj: masked }));
      setNewErrors(prev => ({ ...prev, cpf_cnpj: masked.replace(/\D/g, "").length > 0 && masked.replace(/\D/g, "").length < 11 ? "CPF/CNPJ inválido" : "" }));
      return;
    }
    if (name === "telefone") {
      const country = COUNTRIES.find(c => c.code === newCountry.code)!;
      const maskFn = PHONE_MASKS[newCountry.code];
      const masked = maskFn ? maskFn(value) : value.replace(/\D/g, "").slice(0, country.maxDigits);
      const digits = masked.replace(/\D/g, "");
      const invalid = digits.length > 0 && digits.length < country.maxDigits;
      setNewErrors(prev => ({ ...prev, telefone: invalid ? "Telefone inválido" : "" }));
      setNewForm(prev => ({ ...prev, telefone: masked }));
      return;
    }
    setNewForm(prev => ({ ...prev, [name]: value }));
  }

  async function doNewImageUpload(file: File) {
    setNewUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const path = `clientes/${user.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setNewFotoUrl(urlData.publicUrl);
      showToast("Foto enviada com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao enviar foto: " + err.message, "error");
    } finally {
      setNewUploadingImage(false);
    }
  }

  function handleNewImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      showToast("Formato inválido. Use PNG, JPEG ou WebP.", "error");
      e.target.value = "";
      return;
    }
    setConverterState({
      file,
      spec: IMAGE_SPECS.avatar,
      onAccept: (converted: File) => {
        setConverterState(null);
        doNewImageUpload(converted);
      },
    });
    e.target.value = "";
  }

  async function handleNewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newForm.nome.trim()) { showToast("O nome do cliente é obrigatório.", "error"); return; }
    if (newErrors.email) { showToast("Corrija o e-mail antes de salvar.", "error"); return; }
    if (newErrors.telefone) { showToast("Corrija o telefone antes de salvar.", "error"); return; }
    if (newErrors.cpf_cnpj) { showToast("Corrija o CPF/CNPJ antes de salvar.", "error"); return; }
    setNewLoading(true);
    try {
      const telefoneCompleto = newForm.telefone ? `${newCountry.dial} ${newForm.telefone}` : "";
      await addCliente({ ...newForm, telefone: newCountry.code === "BR" ? newForm.telefone : telefoneCompleto, foto_url: newFotoUrl ?? null });
      await fetchClientes();
      showToast("Cliente criado com sucesso!", "success");
      closeNewModal();
    } catch (err: any) {
      showToast("Erro ao criar cliente: " + err.message, "error");
    } finally {
      setNewLoading(false);
    }
  }

  function handleDragStart(id: string) { setDraggingId(id); }
  function handleDragEnd() { setDraggingId(null); }
  function handleColumnDragOver(e: React.DragEvent<HTMLDivElement>) { e.preventDefault(); }
  function handleColumnDrop(colId: string) {
    if (!draggingId) return;
    setClientStatusMap(prev => ({ ...prev, [draggingId]: colId }));
    setDraggingId(null);
  }

  const filteredClientes = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(q) ||
      c.empresa?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefone?.toLowerCase().includes(q)
    );
  });

  function renderListView() {
    if (loading) return <SkeletonList rows={6} cols={4} />;
    if (!filteredClientes.length) return (
      <div className="cll" style={{ justifyContent: "center", alignItems: "center", border: "1px dashed var(--primary-700)" }}>
        <p style={{ color: "var(--gray-500)", fontSize: 15 }}>Nenhum cliente encontrado.</p>
      </div>
    );

    return (
      <div className="cll">
        <div className="cll-head">
          <span>Nome / Empresa</span>
          <span>Contato</span>
          <span>Data cadastro</span>
          <span className="cll-h-act">Ações</span>
        </div>
        <div className="cll-rows custom-scrollbar">
          {filteredClientes.map((c) => (
            <div key={c.id} className="cll-row">
              <div className="cll-id">
                <ClientAvatar c={c} size={48} />
                <div className="cll-id-txt">
                  <span className="cll-name">{c.nome}</span>
                  <span className="cll-company">
                    <Building2 size={13} />
                    {c.empresa || "Empresa não informada"}
                  </span>
                </div>
              </div>
              <div className="cll-contact">
                {c.email && (
                  <span className="cll-contact-row"><Mail size={15} /> {c.email}</span>
                )}
                {c.telefone && (
                  <span className="cll-contact-row"><Phone size={15} /> {c.telefone}</span>
                )}
              </div>
              <div className="cll-date">
                <Calendar size={15} />
                {new Date(c.created_at).toLocaleDateString("pt-BR")}
              </div>
              <div className="cll-actions">
                <button type="button" className="cl-iconmini" onClick={() => setEditing(c)} title="Editar">
                  <Pencil size={17} />
                </button>
                <button type="button" className="cl-iconmini danger" onClick={() => setConfirmDelete(c.id)} title="Excluir">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderBoardView() {
    if (loading) return <div className="mt-8 text-center text-gray-400">Carregando clientes...</div>;

    const grouped: Record<string, Cliente[]> = {
      potencial: [], em_negociacao: [], cliente: [], inativo: []
    };

    filteredClientes.forEach(c => {
      const status = clientStatusMap[c.id] || "cliente";
      if (grouped[status]) { grouped[status].push(c); }
      else { grouped["cliente"].push(c); }
    });

    return (
      <div className="clb">
        {boardColumns.map(col => {
          const list = grouped[col.id] || [];
          return (
            <section
              key={col.id}
              className="clb-col"
              onDragOver={handleColumnDragOver}
              onDrop={() => handleColumnDrop(col.id)}
            >
              <div className="clb-col-head">
                <span className={`clb-dot tone-${col.tone}`} />
                <span className="clb-col-title">{col.label}</span>
                <span className="clb-col-count">{list.length}</span>
              </div>

              <div className="clb-cards">
                {list.length === 0 ? (
                  <div className="clb-empty">Arraste clientes para cá</div>
                ) : list.map((c: Cliente) => (
                  <article
                    key={c.id}
                    className={`clb-card${draggingId === c.id ? " is-dragging" : ""}`}
                    draggable
                    onDragStart={() => handleDragStart(c.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.stopPropagation(); handleColumnDrop(col.id); }}
                    onClick={() => setEditing(c)}
                  >
                    <div className="clb-card-top">
                      <ClientAvatar c={c} size={52} />
                      <div style={{ position: "relative" }} data-client-menu>
                        <button
                          type="button"
                          className="cl-iconmini"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === c.id ? null : c.id);
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuOpenId === c.id && (
                          <div className="clb-menu" data-client-menu>
                            <button
                              type="button"
                              className="clb-menu-item"
                              onClick={(e) => { e.stopPropagation(); setEditing(c); setMenuOpenId(null); }}
                            >
                              <Pencil size={14} /> Editar
                            </button>
                            <button
                              type="button"
                              className="clb-menu-item danger"
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(c.id); setMenuOpenId(null); }}
                            >
                              <Trash2 size={14} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="clb-card-name">{c.nome}</h3>
                    {c.empresa && (
                      <p className="clb-card-row"><Building2 size={15} /> {c.empresa}</p>
                    )}
                    {c.email && (
                      <p className="clb-card-row"><Mail size={15} /> {c.email}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <PageTour name="clientes" steps={CLIENTES_TOUR_STEPS} />
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmDelete && (
        <ConfirmModal
          message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteConfirmed(confirmDelete)}
        />
      )}

      <div className="cl-page relative flex flex-col flex-1 h-full">
        <div className="cl-glow cl-glow-a" />
        <div className="cl-glow cl-glow-b" />

        <header className="relative z-30 cl-top px-4 sm:px-6 lg:px-8 xl:px-11 py-4 lg:py-[26px]">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <div className="cl-count lg:flex-1">
              <strong>{filteredClientes.length}</strong>{" "}
              {filteredClientes.length === 1 ? "cliente" : "clientes"}
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="cl-seg">
                <button
                  type="button"
                  className={`cl-seg-btn${viewMode === "list" ? " is-on" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="Lista"
                >
                  <LayoutList size={20} />
                </button>
                <button
                  type="button"
                  className={`cl-seg-btn${viewMode === "board" ? " is-on" : ""}`}
                  onClick={() => setViewMode("board")}
                  title="Quadros"
                >
                  <Kanban size={20} />
                </button>
              </div>
              <HeaderProfile />
            </div>
          </div>

          <div className="cl-top-center w-full lg:w-auto">
            <div className="hidden lg:flex">
              <div className="cl-seg">
                <button
                  type="button"
                  className={`cl-seg-btn${viewMode === "list" ? " is-on" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="Lista"
                >
                  <LayoutList size={20} />
                </button>
                <button
                  type="button"
                  className={`cl-seg-btn${viewMode === "board" ? " is-on" : ""}`}
                  onClick={() => setViewMode("board")}
                  title="Quadros"
                >
                  <Kanban size={20} />
                </button>
              </div>
            </div>

            <label className="cl-search w-full lg:w-[320px]">
              <Search size={19} />
              <input
                type="text"
                placeholder="Buscar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="flex items-center gap-3 lg:flex-1 lg:justify-end">
            <button
              type="button"
              id="tour-add-btn"
              className="cl-primary-btn flex-1 lg:flex-none"
              onClick={() => {
                const limit = subscription.limits.clientes;
                if (limit !== null && clientes.length >= limit) {
                  triggerUpgradeBanner("clientes");
                  return;
                }
                openNewModal();
              }}
            >
              <Plus size={19} /> Cliente
            </button>
            <div className="hidden lg:block"><HeaderProfile /></div>
          </div>
        </header>

        <div className="cl-hdr-divider" />

        <main className={`relative z-10 flex-1 flex flex-col px-4 sm:px-6 lg:px-8 xl:px-11 py-4 sm:py-6 min-h-0 ${viewMode === "list" ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"}`}>
          {viewMode === "list" && renderListView()}
          {viewMode === "board" && renderBoardView()}
        </main>
      </div>

      {editing && (
        <div
          className="cl-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
        >
          <div className="cl-modal">
            <form onSubmit={handleUpdate}>
              <div className="cl-modal-head">
                <span className="cl-modal-icon"><Pencil size={22} /></span>
                <h2 className="cl-modal-title">Editar cliente</h2>
              </div>

              <div className="cl-modal-photo">
                <div className="cl-photo-wrap">
                  <ClientAvatar c={editing} size={84} />
                  <label className="cl-photo-edit">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <div className="cl-spinner" />
                    ) : (
                      <Pencil size={15} />
                    )}
                  </label>
                </div>
                <div>
                  <p className="cl-photo-title">Foto do perfil</p>
                  <p className="cl-photo-sub">Clique no ícone de lápis para alterar a foto.</p>
                </div>
              </div>

              <div className="cl-modal-divider" />

              <div className="cl-form">
                <label className="cl-field">
                  <span className="cl-field-label">Nome</span>
                  <input name="nome" type="text" defaultValue={editing.nome} className="cl-field-input" required />
                </label>
                <label className="cl-field">
                  <span className="cl-field-label">Empresa</span>
                  <input name="empresa" type="text" defaultValue={editing.empresa || ""} className="cl-field-input" />
                </label>
                <label className="cl-field">
                  <span className="cl-field-label">E-mail</span>
                  <input name="email" type="email" defaultValue={editing.email || ""} className="cl-field-input" />
                </label>
                <label className="cl-field">
                  <span className="cl-field-label">Telefone</span>
                  <input name="telefone" type="text" defaultValue={editing.telefone || ""} className="cl-field-input" />
                </label>
              </div>

              <div className="cl-modal-foot">
                <button type="button" className="cl-ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
                <button type="submit" className="cl-primary-btn" style={{ padding: "13px 32px" }}>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="cl-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeNewModal(); }}>
          <div className="cn-card">
            <form onSubmit={handleNewSubmit}>
              <div className="cn-head">
                <span className="cn-head-icon"><User size={22} /></span>
                <div>
                  <h1 className="cn-title">Novo cliente</h1>
                  <p className="cn-sub">Adicione um novo cliente ao seu portfólio.</p>
                </div>
              </div>

              <div className="cn-photo">
                <div className="cn-photo-wrap">
                  {newFotoUrl ? (
                    <span className="cn-photo-ph" style={{ padding: 0, overflow: "hidden" }}>
                      <Image src={newFotoUrl} alt="Foto" width={72} height={72} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    </span>
                  ) : (
                    <span className="cn-photo-ph"><User size={30} /></span>
                  )}
                  <label className="cn-photo-edit">
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleNewImageUpload} disabled={newUploadingImage} />
                    {newUploadingImage ? <div className="cl-spinner" /> : <Pencil size={14} />}
                  </label>
                </div>
                <div className="cn-photo-txt">
                  <p className="cn-photo-title">Foto de perfil</p>
                  <p className="cn-photo-hint">{IMAGE_SPECS.avatar.hint}</p>
                </div>
                <label className="cn-photo-btn">
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleNewImageUpload} disabled={newUploadingImage} />
                  {newUploadingImage ? "Enviando…" : "Enviar foto"}
                </label>
              </div>

              <div className="cn-fields">
                <label className="cn-field">
                  <span className="cn-field-label">Nome completo <span className="cn-req">*</span></span>
                  <span className="cn-input-wrap">
                    <span className="cn-input-icon"><User size={18} /></span>
                    <input name="nome" type="text" className="cn-input has-icon" placeholder="Ex: João Silva" value={newForm.nome} onChange={handleNewChange} required />
                  </span>
                </label>

                <div className="cn-row2">
                  <label className="cn-field">
                    <span className="cn-field-label">Empresa</span>
                    <span className="cn-input-wrap">
                      <span className="cn-input-icon"><Building2 size={18} /></span>
                      <input name="empresa" type="text" className="cn-input has-icon" placeholder="Ex: Acme Corp" value={newForm.empresa} onChange={handleNewChange} />
                    </span>
                  </label>
                  <label className="cn-field">
                    <span className="cn-field-label">CPF / CNPJ</span>
                    <span className="cn-input-wrap">
                      <span className="cn-input-icon"><CreditCard size={18} /></span>
                      <input name="cpf_cnpj" type="text" className={`cn-input has-icon${newErrors.cpf_cnpj ? " cn-input-error" : ""}`} placeholder="000.000.000-00" value={newForm.cpf_cnpj} onChange={handleNewChange} />
                    </span>
                    {newErrors.cpf_cnpj && <span className="cn-error">{newErrors.cpf_cnpj}</span>}
                  </label>
                </div>

                <label className="cn-field">
                  <span className="cn-field-label">E-mail</span>
                  <span className="cn-input-wrap">
                    <span className="cn-input-icon"><Mail size={18} /></span>
                    <input name="email" type="email" className={`cn-input has-icon${newErrors.email ? " cn-input-error" : ""}`} placeholder="exemplo@email.com" value={newForm.email} onChange={handleNewChange} />
                  </span>
                  {newErrors.email && <span className="cn-error">{newErrors.email}</span>}
                </label>

                <label className="cn-field">
                  <span className="cn-field-label">Telefone</span>
                  <div className="cn-phone">
                    <select value={newCountry.code} onChange={handleNewCountryChange} className="cn-ddi">
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <span className="cn-input-wrap cn-phone-input">
                      <span className="cn-input-icon"><Phone size={18} /></span>
                      <input name="telefone" type="text" className={`cn-input has-icon${newErrors.telefone ? " cn-input-error" : ""}`} placeholder={COUNTRIES.find(c => c.code === newCountry.code)?.ph ?? ""} value={newForm.telefone} onChange={handleNewChange} />
                    </span>
                  </div>
                  {newErrors.telefone && <span className="cn-error">{newErrors.telefone}</span>}
                </label>
              </div>

              <div className="cn-foot">
                <button type="button" className="cl-ghost" onClick={closeNewModal}>Cancelar</button>
                <button type="submit" className="cl-primary-btn cn-save" disabled={newLoading} style={{ padding: "13px 26px", height: "auto" }}>
                  {newLoading ? "Salvando…" : <><Check size={18} /> Salvar cliente</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* ── Clients page ── */
        .cl-page {
          color: var(--gray-100);
          background: radial-gradient(120% 80% at 50% -10%, var(--primary-800) 0%, var(--primary-900) 55%, var(--primary-900) 100%);
          -webkit-font-smoothing: antialiased;
        }
        .cl-glow {
          position: absolute; border-radius: 50%; filter: blur(100px);
          pointer-events: none; z-index: 0;
        }
        .cl-glow-a {
          width: 460px; height: 460px; right: -160px; top: -140px;
          background: radial-gradient(circle, rgba(113,87,197,0.11), transparent 70%);
        }
        .cl-glow-b {
          width: 460px; height: 460px; right: -160px; bottom: -200px;
          background: radial-gradient(circle, rgba(30,182,232,0.07), transparent 70%);
        }

        /* Header grid */
        .cl-top {
          display: flex; flex-direction: column; gap: 14px;
        }
        @media (min-width: 1024px) {
          .cl-top { display: flex; flex-direction: row; align-items: center; gap: 20px; }
        }
        .cl-count { font-size: 16px; color: var(--gray-300); }
        @media (min-width: 1024px) { .cl-count { font-size: 19px; } }
        .cl-count strong { color: var(--gray-100); font-weight: 700; }
        .cl-top-center { display: flex; align-items: center; gap: 14px; }
        @media (min-width: 1024px) { .cl-top-center { justify-self: center; } }
        .cl-top-right { display: flex; align-items: center; gap: 14px; justify-self: end; }
        .cl-hdr-divider {
          position: relative; z-index: 2; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(148,169,173,0.18) 30%, rgba(148,169,173,0.18) 70%, transparent);
        }

        /* Segment toggle */
        .cl-seg {
          display: flex; gap: 4px; padding: 5px; border-radius: 14px;
          background: var(--primary-800); border: 1px solid var(--primary-700);
        }
        .cl-seg-btn {
          display: grid; place-items: center; width: 46px; height: 40px; border-radius: 10px;
          border: 0; background: none; color: var(--gray-400); cursor: pointer; transition: .2s;
        }
        .cl-seg-btn:hover { color: var(--primary-300); }
        .cl-seg-btn.is-on {
          color: var(--primary-900);
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
          box-shadow: 0 6px 16px -6px rgba(30,182,232,0.7);
        }

        /* Search */
        .cl-search {
          display: flex; align-items: center; gap: 11px; width: 100%; height: 50px; padding: 0 16px;
          border-radius: 13px; color: var(--gray-400);
          background: var(--primary-800); border: 1px solid var(--primary-700); transition: .2s; cursor: text;
        }
        @media (min-width: 1024px) { .cl-search { width: 320px; } }
        .cl-search:focus-within { border-color: var(--primary-500); }
        .cl-search input {
          flex: 1; min-width: 0; background: none; border: 0; outline: none;
          color: var(--gray-100); font-family: inherit; font-size: 15px;
        }
        .cl-search input::placeholder { color: var(--gray-500); }

        /* Primary button */
        .cl-primary-btn {
          display: flex; align-items: center; gap: 8px; height: 50px; padding: 0 22px;
          font-family: inherit; font-size: 15.5px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border: 0; border-radius: 13px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30,182,232,0.8); transition: .2s;
        }
        .cl-primary-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 34px -10px rgba(30,182,232,0.9); }

        /* Icon mini */
        .cl-iconmini {
          display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px;
          border: 0; background: none; color: var(--gray-400); cursor: pointer; transition: .2s;
        }
        .cl-iconmini:hover { background: rgba(148,169,173,0.10); color: var(--gray-100); }
        .cl-iconmini.danger:hover { background: rgba(239,83,80,0.10); color: var(--error-medium); }

        /* Avatar */
        .cl-av {
          flex: none; display: grid; place-items: center; border-radius: 50%; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
          border: 1px solid rgba(255,255,255,0.08); overflow: hidden;
        }
        .cl-av.t1 { background: radial-gradient(130% 130% at 30% 20%, #1b5e75, #0c2d39); color: #d4f2fb; }
        .cl-av.t2 { background: radial-gradient(130% 130% at 30% 20%, #176a86, #0c2f3a); color: #d4f2fb; }
        .cl-av.t3 { background: radial-gradient(130% 130% at 30% 20%, #134a5c, #0b2a33); color: #a8e4f6; }
        .cl-av.t4 { background: radial-gradient(130% 130% at 30% 20%, #20586a, #0d3038); color: #d4f2fb; }
        .cl-av.t5 { background: radial-gradient(130% 130% at 30% 20%, #2c4954, #14262c); color: #e2e9ea; }

        /* List view */
        .cll {
          flex: 1; display: flex; flex-direction: column; min-height: 0;
          border: 1px solid var(--primary-700); border-radius: 20px; overflow: hidden;
          background: var(--primary-800);
        }
        .cll-head { display: none; }
        @media (min-width: 768px) {
          .cll-head {
            display: grid; grid-template-columns: 2.4fr 2fr 1.1fr 0.9fr;
            align-items: center; gap: 24px;
          }
        }
        .cll-head {
          padding: 20px 30px; border-bottom: 1px solid var(--primary-700); flex-shrink: 0;
        }
        .cll-head span {
          font-size: 12.5px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--gray-400);
        }
        .cll-h-act { text-align: right; }
        .cll-rows { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .cll-row {
          display: flex; flex-direction: column; align-items: stretch; gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--primary-700);
          transition: background .2s;
        }
        @media (min-width: 768px) {
          .cll-row {
            display: grid; grid-template-columns: 2.4fr 2fr 1.1fr 0.9fr;
            align-items: center; gap: 24px;
            padding: 18px 30px;
          }
        }
        .cll-row:last-child { border-bottom: 0; }
        .cll-row:hover { background: rgba(148,169,173,0.04); }
        .cll-id { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .cll-id-txt { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .cll-name {
          font-size: 17px; font-weight: 600; color: var(--gray-100);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cll-company {
          display: flex; align-items: center; gap: 7px; font-size: 14px; color: var(--gray-400);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cll-company svg { flex: none; color: var(--gray-500); }
        .cll-contact { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
        .cll-contact-row {
          display: flex; align-items: center; gap: 10px; font-size: 14.5px; color: var(--gray-200);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cll-contact-row svg { flex: none; color: var(--primary-400); }
        .cll-date {
          display: flex; align-items: center; gap: 9px; font-size: 14.5px; color: var(--gray-300);
          font-variant-numeric: tabular-nums;
        }
        .cll-date svg { flex: none; color: var(--gray-500); }
        .cll-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

        /* Edit modal */
        .cl-overlay {
          position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
          padding: 16px;
          background: rgba(4,12,16,0.66); backdrop-filter: blur(3px);
        }
        .cl-modal {
          width: 640px; max-width: calc(100vw - 32px); padding: 24px 20px 22px;
          border-radius: 20px; border: 1px solid var(--primary-600);
          background: linear-gradient(180deg, var(--primary-800), var(--primary-900));
          box-shadow: 0 40px 90px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(30,182,232,0.10), 0 0 80px -30px rgba(30,182,232,0.4);
          max-height: calc(100vh - 32px); overflow-y: auto;
        }
        @media (min-width: 640px) {
          .cl-modal {
            max-width: calc(100% - 80px); padding: 34px 38px 30px;
            border-radius: 24px; max-height: calc(100vh - 80px);
          }
        }
        .cl-modal-head { display: flex; align-items: center; gap: 14px; }
        .cl-modal-icon {
          display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px;
          color: var(--primary-300); background: rgba(30,182,232,0.12); border: 1px solid rgba(30,182,232,0.30);
        }
        .cl-modal-title { margin: 0; font-size: 24px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.01em; }
        .cl-modal-photo { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; margin-top: 20px; }
        @media (min-width: 480px) {
          .cl-modal-photo { flex-direction: row; align-items: center; gap: 20px; margin-top: 26px; }
        }
        .cl-photo-wrap { position: relative; flex: none; }
        .cl-photo-edit {
          position: absolute; right: -2px; bottom: -2px; display: grid; place-items: center;
          width: 30px; height: 30px; border-radius: 50%;
          border: 2.5px solid var(--primary-900); color: var(--primary-900); cursor: pointer;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
          box-shadow: 0 6px 14px -5px rgba(30,182,232,0.8);
        }
        .cl-photo-title { margin: 0; font-size: 17px; font-weight: 600; color: var(--gray-100); }
        .cl-photo-sub { margin: 5px 0 0; font-size: 14px; color: var(--gray-400); }
        .cl-modal-divider { height: 1px; margin: 20px 0; background: var(--primary-700); }
        @media (min-width: 640px) { .cl-modal-divider { margin: 26px 0; } }
        .cl-form { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .cl-form { grid-template-columns: 1fr 1fr; gap: 20px 22px; } }
        .cl-field { display: flex; flex-direction: column; gap: 9px; }
        .cl-field-label {
          font-size: 12.5px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--gray-400);
        }
        .cl-field-input {
          height: 52px; padding: 0 18px; border-radius: 13px;
          border: 1px solid var(--primary-700); background: var(--primary-900);
          color: var(--gray-100); font-family: inherit; font-size: 15.5px; transition: .2s;
        }
        .cl-field-input:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px rgba(30,182,232,0.12); }
        .cl-modal-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        @media (min-width: 640px) { .cl-modal-foot { margin-top: 30px; } }
        .cl-ghost {
          font-family: inherit; font-size: 15.5px; font-weight: 500; color: var(--gray-200);
          cursor: pointer; padding: 13px 26px; border-radius: 13px;
          border: 1px solid var(--primary-700); background: var(--primary-800); transition: .2s;
        }
        .cl-ghost:hover { border-color: var(--gray-400); color: var(--gray-100); }

        /* Spinner */
        .cl-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid var(--primary-900); border-top-color: transparent;
          animation: clSpin .6s linear infinite;
        }
        @keyframes clSpin { to { transform: rotate(360deg); } }

        /* ── New client modal ── */
        .cn-card {
          width: 660px; max-width: calc(100vw - 32px);
          padding: 20px 20px 20px; border-radius: 20px;
          border: 1px solid var(--primary-700);
          background: linear-gradient(180deg, var(--primary-800), var(--primary-900));
          box-shadow: 0 40px 90px -40px rgba(0,0,0,0.7), 0 0 80px -40px rgba(30,182,232,0.25);
          max-height: calc(100vh - 32px); overflow-y: auto;
        }
        @media (min-width: 640px) {
          .cn-card {
            max-width: calc(100vw - 80px);
            padding: 28px 40px 24px; border-radius: 26px;
            max-height: calc(100vh - 80px);
          }
        }
        .cn-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .cn-head-icon {
          flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px;
          color: var(--primary-300); background: rgba(30,182,232,0.12); border: 1px solid rgba(30,182,232,0.30);
        }
        .cn-title { margin: 0; font-size: 23px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; }
        .cn-sub { margin: 3px 0 0; font-size: 14px; color: var(--gray-400); }

        .cn-photo {
          display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 13px 16px; margin-bottom: 18px;
          border-radius: 14px; border: 1px solid var(--primary-700); background: var(--primary-900);
        }
        .cn-photo-wrap { position: relative; flex: none; }
        .cn-photo-ph {
          display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%;
          color: var(--primary-400);
          background: var(--primary-700);
          border: 1px solid var(--primary-600);
        }
        .cn-photo-edit {
          position: absolute; right: -2px; bottom: 0; display: grid; place-items: center;
          width: 26px; height: 26px; border-radius: 50%;
          border: 2.5px solid var(--primary-900); color: var(--primary-900); cursor: pointer;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500));
          box-shadow: 0 6px 14px -5px rgba(30,182,232,0.85); transition: .2s;
        }
        .cn-photo-edit:hover { transform: scale(1.06); }
        .cn-photo-txt { flex: 1; min-width: 0; }
        .cn-photo-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--gray-100); }
        .cn-photo-hint { margin: 3px 0 0; font-size: 12px; color: var(--gray-500); }
        .cn-photo-btn {
          flex: none; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--primary-300); cursor: pointer;
          padding: 8px 15px; border-radius: 10px; border: 1px solid rgba(30,182,232,0.35);
          background: rgba(30,182,232,0.08); transition: .2s;
        }
        .cn-photo-btn:hover { background: rgba(30,182,232,0.14); color: var(--primary-200); }

        .cn-fields { display: flex; flex-direction: column; gap: 13px; }
        .cn-row2 { display: grid; grid-template-columns: 1fr; gap: 13px; }
        @media (min-width: 480px) { .cn-row2 { grid-template-columns: 1fr 1fr; } }
        .cn-field { display: flex; flex-direction: column; gap: 7px; }
        .cn-field-label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--gray-300); }
        .cn-req { color: var(--primary-400); margin-left: 2px; }
        .cn-input-wrap { position: relative; display: flex; align-items: center; }
        .cn-input-icon { position: absolute; left: 14px; display: grid; place-items: center; color: var(--gray-500); pointer-events: none; }
        .cn-input {
          width: 100%; height: 46px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--primary-700); background: var(--primary-900);
          color: var(--gray-100); font-family: inherit; font-size: 15px; transition: .2s;
        }
        .cn-input.has-icon { padding-left: 42px; }
        .cn-input::placeholder { color: var(--gray-500); }
        .cn-input:focus { outline: none; border-color: var(--primary-500); background: var(--primary-900); box-shadow: 0 0 0 3px rgba(30,182,232,0.14); }
        .cn-input-wrap:focus-within .cn-input-icon { color: var(--primary-400); }
        .cn-input-error { border-color: var(--error-medium) !important; }
        .cn-input-error:focus { box-shadow: 0 0 0 3px rgba(239,83,80,0.14) !important; }
        .cn-error { font-size: 11.5px; color: var(--error-medium); margin-top: -3px; }

        .cn-phone { display: flex; flex-wrap: wrap; gap: 10px; }
        .cn-ddi {
          appearance: none; flex: none; height: 46px; padding: 0 13px; border-radius: 12px;
          border: 1px solid var(--primary-700); background: var(--primary-900);
          color: var(--gray-100); cursor: pointer; font-family: inherit; font-size: 14.5px; font-weight: 500; transition: .2s;
        }
        .cn-ddi:hover { border-color: var(--gray-400); }
        .cn-ddi:focus { outline: none; border-color: var(--primary-500); }
        .cn-phone-input { flex: 1; min-width: 0; }

        .cn-foot {
          display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px;
          margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--primary-700);
        }
        .cn-save { display: flex; align-items: center; gap: 9px; }

        /* ── Board view ── */
        .clb {
          display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start;
          padding-bottom: 32px; min-width: 0;
        }
        @media (min-width: 640px) {
          .clb { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .clb { grid-template-columns: repeat(4, 1fr); gap: 22px; }
        }
        .clb-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; overflow: hidden; }
        .clb-col-head {
          display: flex; align-items: center; gap: 11px;
          padding: 0 6px 14px; border-bottom: 1px solid var(--primary-700);
        }
        .clb-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
        .clb-dot.tone-primary { background: var(--primary-400); box-shadow: 0 0 10px -1px var(--primary-500); }
        .clb-dot.tone-alert   { background: var(--alert-medium); box-shadow: 0 0 10px -1px var(--alert-medium); }
        .clb-dot.tone-success { background: var(--success-medium); box-shadow: 0 0 10px -1px var(--success-medium); }
        .clb-dot.tone-neutral { background: var(--gray-500); }
        .clb-col-title { flex: 1; font-size: 16px; font-weight: 600; color: var(--gray-100); }
        .clb-col-count {
          font-size: 14px; font-weight: 600; color: var(--gray-400);
          min-width: 26px; height: 26px; padding: 0 8px;
          border-radius: 8px; display: grid; place-items: center;
          background: rgba(148,169,173,0.08);
        }
        .clb-cards { display: flex; flex-direction: column; gap: 14px; }
        .clb-empty {
          padding: 26px 16px; border-radius: 14px;
          border: 1px dashed var(--primary-700); text-align: center;
          font-size: 13.5px; color: var(--gray-500);
        }
        .clb-card {
          padding: 20px; border-radius: 18px; border: 1px solid var(--primary-700);
          background: var(--primary-800);
          transition: .2s; cursor: pointer;
        }
        .clb-card:hover { border-color: var(--primary-500); transform: translateY(-3px); box-shadow: 0 20px 44px -24px rgba(0,0,0,0.6); }
        .clb-card.is-dragging { opacity: 0.45; border-style: dashed; }
        .clb-card-top {
          display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;
        }
        .clb-card-name { margin: 0 0 12px; font-size: 19px; font-weight: 600; color: var(--gray-100); letter-spacing: -0.01em; }
        .clb-card-row {
          margin: 7px 0 0; display: flex; align-items: center; gap: 9px;
          font-size: 14.5px; color: var(--gray-400);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .clb-card-row svg { flex: none; color: var(--gray-500); }

        /* Board card dropdown menu */
        .clb-menu {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: 20;
          min-width: 140px; padding: 6px; border-radius: 12px;
          border: 1px solid var(--primary-700);
          background: var(--primary-800);
          box-shadow: 0 16px 40px -12px rgba(0,0,0,0.6);
        }
        .clb-menu-item {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 9px 12px; border-radius: 8px; border: 0; background: none;
          font-family: inherit; font-size: 14px; font-weight: 500;
          color: var(--gray-200); cursor: pointer; transition: .15s; text-align: left;
        }
        .clb-menu-item:hover { background: rgba(148,169,173,0.08); color: var(--gray-100); }
        .clb-menu-item.danger { color: var(--error-medium); }
        .clb-menu-item.danger:hover { background: rgba(239,83,80,0.10); }

        /* Scrollbar */
        .cll-rows::-webkit-scrollbar { width: 6px; }
        .cll-rows::-webkit-scrollbar-track { background: transparent; }
        .cll-rows::-webkit-scrollbar-thumb {
          background: var(--primary-700); border-radius: 999px;
          border: 2px solid var(--primary-900);
        }
        .cll-rows::-webkit-scrollbar-thumb:hover { background: var(--primary-600); }
      `}</style>

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
