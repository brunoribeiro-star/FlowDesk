"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import {
  getClientes,
  deleteCliente,
  updateCliente,
  Cliente,
} from "@/lib/supabaseQueries/clientes";
import { supabase } from "@/lib/supabaseClient";
import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
  Search,
  LayoutList,
  Kanban,
  Phone,
  Mail,
  Building2,
  MoreVertical,
  Trash2,
  Edit,
  User,
} from "lucide-react";

type ViewMode = "list" | "board";

function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed z-50 top-6 right-6 px-6 py-4 rounded-xl flex items-center gap-3 shadow-xl backdrop-blur-md transition-all animate-fade-in
      ${
        type === "success"
          ? "bg-green-500/10 border border-green-500/20 text-green-400"
          : "bg-red-500/10 border border-red-500/20 text-red-400"
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${type === "success" ? "bg-green-500" : "bg-red-500"}`} />
      <span className="font-medium text-[15px]">{message}</span>
    </div>
  );
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-primary-900 border border-primary-700 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600" />
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-red-400">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-100">Confirmar exclusão</h3>
          </div>
          
          <p className="text-gray-300 leading-relaxed text-[15px]">{message}</p>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-primary-800">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-gray-300 hover:bg-primary-800 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all text-sm font-medium flex items-center gap-2"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState("/perfil.svg");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [clientStatusMap, setClientStatusMap] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const boardColumns = [
    { id: "potencial", label: "Potencial", color: "bg-blue-500" },
    { id: "em_negociacao", label: "Em Negociação", color: "bg-amber-500" },
    { id: "cliente", label: "Cliente", color: "bg-green-500" },
    { id: "inativo", label: "Inativo", color: "bg-gray-500" },
  ];

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetchClientes();
    
    async function getUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.user_metadata?.avatar_url) {
          setUserAvatarUrl(user.user_metadata.avatar_url);
        }
      }
    }
    getUserProfile();

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
        if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
          setProfileOpen(false);
        }
        const target = event.target as HTMLElement;
        if (!target.closest("[data-client-menu]")) {
            setMenuOpenId(null);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  useEffect(() => {
      localStorage.setItem("clientesParams", JSON.stringify({ viewMode }));
  }, [viewMode]);

  useEffect(() => {
      localStorage.setItem("clientesBoardState", JSON.stringify(clientStatusMap));
  }, [clientStatusMap]);

  async function fetchClientes() {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (err: any) {
      setError(err.message);
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
      observacoes: (formData.get("observacoes") as string) || null,
      foto_url: editing.foto_url, // Mantém a URL da foto atual (já atualizada pelo upload)
    };

    try {
      const updated = await updateCliente(editing.id, updates);
      setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditing(null);
      showToast("Cliente atualizado com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao atualizar cliente", "error");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const path = `clientes/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Atualiza o estado local 'editing' para mostrar a nova foto imediatamente
      setEditing(prev => prev ? { ...prev, foto_url: urlData.publicUrl } : null);
      showToast("Foto enviada com sucesso!", "success");
      
    } catch (error: any) {
      showToast("Erro ao enviar foto: " + error.message, "error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleEditProfile() {
    setProfileOpen(false);
  }
  async function handleTheme() {
    setProfileOpen(false);
  }
  async function handleSignature() {
    setProfileOpen(false);
    router.push("/dashboard/assinatura");
  }

  function handleDragStart(id: string) {
      setDraggingId(id);
  }
  
  function handleDragEnd() {
      setDraggingId(null);
  }

  function handleColumnDragOver(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault();
  }

  function handleColumnDrop(colId: string) {
      if (!draggingId) return;
      
      setClientStatusMap(prev => ({
          ...prev,
          [draggingId]: colId
      }));
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

  function renderViewToggle() {
    return (
      <div className="flex bg-primary-800 rounded-lg p-1 border border-primary-700">
        <button
          onClick={() => setViewMode("list")}
          className={`p-2 rounded-md transition-all ${
            viewMode === "list" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
          }`}
          title="Lista"
        >
          <LayoutList size={16} />
        </button>
        <button
          onClick={() => setViewMode("board")}
          className={`p-2 rounded-md transition-all ${
            viewMode === "board" ? "bg-primary-600 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-200"
          }`}
          title="Quadros"
        >
          <Kanban size={16} />
        </button>
      </div>
    );
  }

  function renderListView() {
      if (loading) return <div className="mt-8 text-center text-gray-400">Carregando clientes...</div>;
      if (!filteredClientes.length) return <div className="mt-8 text-center text-gray-400">Nenhum cliente encontrado.</div>;

    return (
      <div className="flex-1 bg-primary-900/40 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-primary-700 text-[13px] text-gray-400 flex items-center gap-4 font-medium uppercase tracking-wider bg-primary-900/50">
          <div className="flex-1 min-w-[200px]">Nome / Empresa</div>
          <div className="w-[200px] hidden md:block">Contato</div>
          <div className="w-[150px] hidden lg:block">Data Cadastro</div>
          <div className="w-[100px] text-right">Ações</div>
        </div>

        <div className="flex-1 custom-scrollbar overflow-y-auto">
             <div className="flex flex-col">
              {filteredClientes.map((c) => (
                <div
                  key={c.id}
                  className="group w-full border-b border-primary-700 hover:bg-primary-800/30 px-6 py-4 flex items-center gap-4 transition-colors last:border-0"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                      <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center border border-primary-700 text-primary-200 shrink-0 overflow-hidden">
                          {c.foto_url ? (
                              <Image src={c.foto_url} alt={c.nome} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                              <span className="text-lg font-bold">{c.nome.charAt(0).toUpperCase()}</span>
                          )}
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-[15px] text-gray-100 font-medium truncate">{c.nome}</span>
                          <span className="text-[13px] text-gray-400 truncate flex items-center gap-1.5">
                             {c.empresa && <Building2 size={12} />}
                             {c.empresa || "Empresa não informada"}
                          </span>
                      </div>
                  </div>

                  <div className="w-[200px] hidden md:flex flex-col gap-1">
                      {c.email && (
                          <div className="flex items-center gap-2 text-[13px] text-gray-300 truncate" title={c.email}>
                              <Mail size={12} className="text-primary-400" />
                              {c.email}
                          </div>
                      )}
                      {c.telefone && (
                          <div className="flex items-center gap-2 text-[13px] text-gray-400 truncate">
                              <Phone size={12} className="text-primary-400" />
                              {c.telefone}
                          </div>
                      )}
                  </div>

                  <div className="w-[150px] hidden lg:flex text-[13px] text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="w-[100px] flex justify-end">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditing(c)}
                            className="p-2 text-gray-400 hover:text-primary-300 hover:bg-primary-800 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(c.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-primary-800 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    );
  }

  function renderBoardView() {
    if (loading) return <div className="mt-8 text-center text-gray-400">Carregando clientes...</div>;
    
    const grouped: Record<string, Cliente[]> = {
        potencial: [],
        em_negociacao: [],
        cliente: [],
        inativo: []
    };

    filteredClientes.forEach(c => {
        const status = clientStatusMap[c.id] || 'cliente';
        if (grouped[status]) {
            grouped[status].push(c);
        } else {
            grouped['cliente'].push(c);
        }
    });

    return (
      <div className="mt-6 h-full min-h-0 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex min-h-0 divide-x divide-primary-700">
           {boardColumns.map(col => {
               const list = grouped[col.id] || [];
               return (
                   <div key={col.id} className="min-w-[320px] w-[360px] px-4 flex flex-col min-h-0">
                       <div className="px-2 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                                <span className="text-[14px] font-medium text-gray-200">{col.label}</span>
                                <span className="text-[12px] text-gray-500 bg-primary-800 px-2 py-0.5 rounded-full">{list.length}</span>
                            </div>
                       </div>

                       <div 
                           className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 flex flex-col gap-3 custom-scrollbar"
                           onDragOver={handleColumnDragOver}
                           onDrop={() => handleColumnDrop(col.id)}
                        >
                           {list.map((c: Cliente) => (
                               <div
                                 key={c.id}
                                 draggable
                                 onDragStart={() => handleDragStart(c.id)}
                                 onDragEnd={handleDragEnd}
                                 className={`bg-primary-800/40 hover:bg-primary-800 border border-primary-700 hover:border-primary-500 rounded-xl p-4 cursor-grab active:cursor-grabbing group transition-all ${
                                     draggingId === c.id ? 'opacity-50 border-dashed border-primary-500 bg-primary-800/20' : ''
                                 }`}
                                 onClick={() => setEditing(c)}
                               >
                                   <div className="flex items-start justify-between mb-3">
                                       <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-primary-200 shrink-0 border border-primary-600 overflow-hidden">
                                          {c.foto_url ? (
                                              <Image src={c.foto_url} alt={c.nome} width={36} height={36} className="w-full h-full object-cover" />
                                          ) : (
                                              <User size={18} />
                                          )}
                                       </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(c.id); }}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                   </div>
                                   
                                   <h4 className="text-[15px] font-medium text-gray-100 mb-1">{c.nome}</h4>
                                   <div className="flex flex-col gap-1 text-[12px] text-gray-400">
                                       {c.empresa && <span className="flex items-center gap-1.5"><Building2 size={10} /> {c.empresa}</span>}
                                       {c.email && <span className="flex items-center gap-1.5"><Mail size={10} /> {c.email}</span>}
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
               )
           })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      {toast && <Toast message={toast.message} type={toast.type} />}

      {confirmDelete && (
        <ConfirmModal
          message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteConfirmed(confirmDelete)}
        />
      )}

      <div className="flex flex-col flex-1 gap-4 pr-6 py-4 w-full overflow-hidden relative">
          
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between gap-4 w-full">
              <span className="text-[15px] text-gray-300">
                {filteredClientes.length === 0 ? "Nenhum cliente" : filteredClientes.length === 1 ? "1 cliente" : `${filteredClientes.length} clientes`}
              </span>

              <div className="flex-1" />

              <div className="flex items-center gap-3">
                {renderViewToggle()}

                <div className="flex items-center gap-3 bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 w-[240px]">
                  <Search size={18} className="text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full bg-transparent outline-none text-[14px] text-gray-200 placeholder-gray-400"
                  />
                </div>

                <div className="w-px h-8 bg-primary-700 mx-2" />

                <Link href="/dashboard/clientes/novo">
                    <button
                    className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-2 px-6 text-[15px] font-semibold transition-colors shadow-lg shadow-primary-500/20"
                    >
                    + Cliente
                    </button>
                </Link>

                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-primary-800 transition-all border border-transparent hover:border-primary-700 group"
                  >
                     <div className="w-9 h-9 rounded-full overflow-hidden border border-primary-600 bg-primary-900 group-hover:border-primary-500 transition-colors">
                        <Image src={userAvatarUrl} alt="Avatar" width={36} height={36} className="object-cover w-full h-full" />
                     </div>
                    {profileOpen ? (
                       <ChevronUp size={18} className="text-gray-400 group-hover:text-gray-200 transition-colors" />
                    ) : (
                       <ChevronDown size={18} className="text-gray-400 group-hover:text-gray-200 transition-colors" />
                    )}
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-primary-800 border border-primary-600 rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-fade-in z-50">
                      <button className="flex items-center gap-3 text-gray-200 hover:text-primary-100 transition-colors" onClick={handleEditProfile}>
                        <Pencil size={20} className="text-primary-200" />
                        Editar perfil
                      </button>

                      <button className="flex items-center gap-3 text-gray-200 hover:text-primary-100 transition-colors" onClick={handleTheme}>
                        <SlidersHorizontal size={20} className="text-primary-200" />
                        Personalizar tema
                      </button>

                      <button className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300 transition-colors" onClick={handleSignature}>
                        <Crown size={20} />
                        Assinatura
                      </button>

                      <button
                        className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors pt-2"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          router.push("/login");
                        }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sair da plataforma
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <section className="flex-1 h-full min-h-0 overflow-hidden pr-4 flex flex-col">
            {viewMode === "list" && renderListView()}
            {viewMode === "board" && renderBoardView()}
          </section>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-900 border border-primary-700 rounded-2xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-2xl text-gray-100 font-semibold mb-6 flex items-center gap-2">
                <div className="p-2 bg-primary-800 rounded-lg"><Edit size={20} className="text-primary-400"/></div>
                Editar cliente
            </h2>

            <form onSubmit={handleUpdate} className="flex flex-col gap-6">
              
              {/* Foto Upload Section */}
              <div className="flex items-center gap-6 pb-6 border-b border-primary-800">
                <div className="relative group">
                  <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-primary-800 border-2 border-primary-700 flex items-center justify-center">
                    {editing.foto_url ? (
                      <img 
                        src={editing.foto_url} 
                        alt="Foto do cliente" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={40} className="text-primary-500/50" />
                    )}
                  </div>
                  
                  <label className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full text-primary-900 cursor-pointer shadow-lg hover:bg-primary-400 transition-colors">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Pencil size={14} strokeWidth={2.5} />
                    )}
                  </label>
                </div>
                
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-medium text-gray-200">Foto do Perfil</h3>
                  <p className="text-sm text-gray-400">Clique no ícone de lápis para alterar a foto.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</label>
                      <input
                        name="nome"
                        defaultValue={editing.nome}
                        placeholder="Nome completo"
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600"
                        required
                      />
                  </div>
                  
                  {/* Empresa */}
                  <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Empresa</label>
                      <input
                        name="empresa"
                        defaultValue={editing.empresa || ""}
                        placeholder="Nome da empresa"
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600"
                      />
                  </div>

                  {/* E-mail */}
                  <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">E-mail</label>
                      <input
                        name="email"
                        defaultValue={editing.email || ""}
                        placeholder="exemplo@email.com"
                        type="email"
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600"
                      />
                  </div>

                  {/* Telefone */}
                  <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Telefone</label>
                      <input
                        name="telefone"
                        defaultValue={editing.telefone || ""}
                        placeholder="(00) 00000-0000"
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600"
                      />
                  </div>

                  {/* Observações - Full Width */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Observações</label>
                      <textarea
                        name="observacoes"
                        defaultValue={editing.observacoes || ""}
                        placeholder="Observações sobre o cliente..."
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600 min-h-[100px] resize-y"
                      />
                  </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-primary-800">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-6 py-2.5 rounded-xl bg-transparent border border-primary-700 text-gray-300 hover:bg-primary-800 transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary-500 text-primary-900 font-bold hover:bg-primary-400 transition-colors text-sm shadow-lg shadow-primary-500/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-700);
          border-radius: 9999px;
          border: 2px solid var(--primary-900);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-600);
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
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