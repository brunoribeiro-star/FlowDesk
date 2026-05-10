"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import HeaderProfile from "@/components/HeaderProfile";
import {
  getClientes,
  deleteCliente,
  updateCliente,
  Cliente,
} from "@/lib/supabaseQueries/clientes";
import { supabase } from "@/lib/supabaseClient";
import { SkeletonList } from "@/components/Skeleton";
import { validateImageFile } from "@/lib/utils";
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
  Edit,
  User,
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


export default function ClientesPage() {
  const router = useRouter();
  const subscription = useSubscription();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const editingRef = useRef<Cliente | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const { converterState, triggerConverter, cancelConverter } = useImageConverter();
  const [clientStatusMap, setClientStatusMap] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardStateInitialized = useRef(false);
  const viewModeInitialized = useRef(false);

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
      if (!viewModeInitialized.current) {
          viewModeInitialized.current = true;
          return;
      }
      localStorage.setItem("clientesParams", JSON.stringify({ viewMode }));
  }, [viewMode]);

  useEffect(() => {
      if (!boardStateInitialized.current) {
          boardStateInitialized.current = true;
          return;
      }
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
      if (loading) return <SkeletonList rows={6} cols={4} />;
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
      <div className="mt-6 pb-6">
        <div className="grid grid-cols-4 divide-x divide-primary-700">
           {boardColumns.map(col => {
               const list = grouped[col.id] || [];
               return (
                   <div key={col.id} className="min-w-0 px-4 flex flex-col">
                       <div className="px-2 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                                <span className="text-[14px] font-medium text-gray-200">{col.label}</span>
                                <span className="text-[12px] text-gray-500 bg-primary-800 px-2 py-0.5 rounded-full">{list.length}</span>
                            </div>
                       </div>

                       <div
                           className="px-2 pb-4 flex flex-col gap-3 min-h-[120px]"
                           onDragOver={handleColumnDragOver}
                           onDrop={() => handleColumnDrop(col.id)}
                        >
                           {list.map((c: Cliente) => (
                               <div
                                 key={c.id}
                                 draggable
                                 onDragStart={() => handleDragStart(c.id)}
                                 onDragEnd={handleDragEnd}
                                 onDragOver={(e) => e.preventDefault()}
                                 onDrop={(e) => { e.stopPropagation(); handleColumnDrop(col.id); }}
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

      <div className={`flex flex-col flex-1 gap-4 pr-6 py-4 w-full relative ${viewMode === "board" ? "overflow-y-auto" : "overflow-hidden"}`}>
          
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

                <button
                  onClick={() => {
                    const limit = subscription.limits.clientes;
                    if (limit !== null && clientes.length >= limit) {
                      triggerUpgradeBanner("clientes");
                      return;
                    }
                    router.push("/dashboard/clientes/novo");
                  }}
                  id="tour-add-btn"
                  className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-2 px-6 text-[15px] font-semibold transition-colors shadow-lg shadow-primary-500/20"
                >
                  + Cliente
                </button>

                <HeaderProfile />
              </div>
            </div>
          </div>

          <section className={`flex-1 pr-4 flex flex-col ${viewMode === "list" ? "h-full min-h-0 overflow-hidden" : ""}`}>
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
                      accept="image/jpeg,image/png,image/webp"
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
                  
                  <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Empresa</label>
                      <input
                        name="empresa"
                        defaultValue={editing.empresa || ""}
                        placeholder="Nome da empresa"
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600"
                      />
                  </div>

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

                  <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Telefone</label>
                      <input
                        name="telefone"
                        defaultValue={editing.telefone || ""}
                        placeholder="(00) 00000-0000"
                        className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600"
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