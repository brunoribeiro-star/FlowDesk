"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getClientes, addCliente } from "@/lib/supabaseQueries/clientes";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import { UserPlus, Plus, Trash2, ChevronRight as ChevRight, User, Pencil, UploadCloud, ImageIcon, X, Check } from "lucide-react";
import Image from "next/image";
import DatePicker from "@/components/DatePicker";

interface FormProjeto {
  titulo: string;
  descricao: string;
  tipo: string;
  cliente_id: string | null;
  orcamento: string;
  data_inicio: string;
  prazo_entrega: string;
  status: string;
  progresso: number;
  notas_internas: string;
  forma_pagamento: "pix" | "pix_2x" | "cartao";
  ja_pago: boolean;
}

interface ProjetoLink {
  id: number;
  titulo: string;
  url: string;
}

export default function NovoProjetoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });

  const [form, setForm] = useState<FormProjeto>({
    titulo: "",
    descricao: "",
    tipo: "",
    cliente_id: null,
    orcamento: "",
    data_inicio: "",
    prazo_entrega: "",
    status: "Para fazer",
    progresso: 0,
    notas_internas: "",
    forma_pagamento: "" as any,
    ja_pago: false,
  });

  const [attemptedStep1, setAttemptedStep1] = useState(false);
  const [attemptedStep2, setAttemptedStep2] = useState(false);

  const [projetoLinks, setProjetoLinks] = useState<ProjetoLink[]>([]);
  const [nextLinkId, setNextLinkId] = useState(1);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);

  const CLIENT_COUNTRIES = [
    { code: "BR", name: "Brasil",          dial: "+55",  flag: "🇧🇷" },
    { code: "US", name: "Estados Unidos",  dial: "+1",   flag: "🇺🇸" },
    { code: "PT", name: "Portugal",        dial: "+351", flag: "🇵🇹" },
    { code: "AR", name: "Argentina",       dial: "+54",  flag: "🇦🇷" },
  ];

  const [newClientModal, setNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    nome: "", empresa: "", email: "", telefone: "", cpf_cnpj: "",
  });
  const [newClientFoto, setNewClientFoto]   = useState<string | null>(null);
  const [newClientCountry, setNewClientCountry] = useState(CLIENT_COUNTRIES[0]);
  const { converterState, triggerConverter, cancelConverter } = useImageConverter();
  const [newClientErrors, setNewClientErrors] = useState({ email: "", telefone: "", cpf_cnpj: "" });
  const [uploadingClientFoto, setUploadingClientFoto] = useState(false);
  const [savingClient, setSavingClient] = useState(false);

  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaboratorSplitType, setCollaboratorSplitType] = useState<"percentage" | "fixed">("percentage");
  const [collaboratorSplitValue, setCollaboratorSplitValue] = useState("");
  const [collaboratorAlreadyPaid, setCollaboratorAlreadyPaid] = useState(false);
  const [inviteLinkModal, setInviteLinkModal] = useState<{ link: string; email_sent: boolean } | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.toLowerCase());

  const maskPhoneBR = (v: string) => {
    let d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const maskCpfCnpj = (v: string) => {
    let d = v.replace(/\D/g, "");
    if (d.length <= 11) {
      d = d.slice(0, 11);
      return d.replace(/^(\d{3})(\d)/, "$1.$2")
               .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
               .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }
    d = d.slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, "$1.$2")
             .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
             .replace(/\.(\d{3})(\d)/, ".$1/$2")
             .replace(/(\d{4})(\d)/, "$1-$2");
  };

  function handleNewClientChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === "email") {
      setNewClientErrors(p => ({ ...p, email: value && !validateEmail(value) ? "E-mail inválido" : "" }));
      setNewClientForm(p => ({ ...p, email: value }));
      return;
    }
    if (name === "cpf_cnpj") {
      const masked = maskCpfCnpj(value);
      setNewClientErrors(p => ({ ...p, cpf_cnpj: masked.length < 14 ? "CPF/CNPJ inválido" : "" }));
      setNewClientForm(p => ({ ...p, cpf_cnpj: masked }));
      return;
    }
    if (name === "telefone") {
      if (newClientCountry.code === "BR") {
        const raw = value.replace(newClientCountry.dial, "").trim();
        const masked = maskPhoneBR(raw);
        setNewClientErrors(p => ({ ...p, telefone: masked.replace(/\D/g, "").length !== 11 ? "Telefone inválido" : "" }));
        setNewClientForm(p => ({ ...p, telefone: `${newClientCountry.dial} ${masked}` }));
        return;
      }
      setNewClientForm(p => ({ ...p, telefone: value }));
      return;
    }
    setNewClientForm(p => ({ ...p, [name]: value }));
  }

  function handleNewClientCountry(e: React.ChangeEvent<HTMLSelectElement>) {
    const c = CLIENT_COUNTRIES.find(x => x.code === e.target.value);
    if (!c) return;
    setNewClientCountry(c);
    setNewClientForm(p => ({ ...p, telefone: `${c.dial} ` }));
    setNewClientErrors(p => ({ ...p, telefone: "" }));
  }

  async function uploadNewClientFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerConverter(file, IMAGE_SPECS.avatar, async (f) => {
      setUploadingClientFoto(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const path = `clientes/${user.id}/${Date.now()}.webp`;
        const { error } = await supabase.storage.from("avatars").upload(path, f, { contentType: f.type });
        if (error) { showPopup("Erro ao enviar foto: " + error.message, "error"); return; }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        setNewClientFoto(urlData.publicUrl);
      } catch (err: any) {
        showPopup("Erro ao enviar foto: " + err.message, "error");
      } finally {
        setUploadingClientFoto(false);
      }
    });
    e.target.value = "";
  }

  type SubtaskDraft = { id: number; titulo: string };
  type TaskDraft    = { id: number; titulo: string; subtasks: SubtaskDraft[] };
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [nextId, setNextId] = useState(1);

  function addTask() {
    const id = nextId;
    setTasks(prev => [...prev, { id, titulo: "", subtasks: [] }]);
    setNextId(n => n + 1);
  }
  function removeTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }
  function updateTask(id: number, titulo: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, titulo } : t));
  }
  function addSubtask(taskId: number) {
    const id = nextId;
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, subtasks: [...t.subtasks, { id, titulo: "" }] } : t
    ));
    setNextId(n => n + 1);
  }
  function removeSubtask(taskId: number, subId: number) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subId) } : t
    ));
  }
  function updateSubtask(taskId: number, subId: number, titulo: string) {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, titulo } : s) }
        : t
    ));
  }

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const handleCoverChange = (file: File | null) => {
    setIsCoverModalOpen(false);
    if (!file) {
      setCoverFile(null);
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverPreview("");
      return;
    }
    triggerConverter(file, IMAGE_SPECS.card, (f) => {
      setCoverFile(f);
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverPreview(URL.createObjectURL(f));
    });
  };

  function handleCoverDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleCoverChange(file);
    } else if (file) {
      showPopup("Por favor, envie um arquivo de imagem válido.", "error");
    }
  }

  function handleCoverDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingCover(true);
  }

  function handleCoverDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingCover(false);
  }

  function addLink() {
     setProjetoLinks(prev => [...prev, { id: nextLinkId, titulo: "", url: "" }]);
     setNextLinkId(n => n + 1);
  }
  
  function updateLink(id: number, field: keyof ProjetoLink, value: string) {
     setProjetoLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }
  
  function removeLink(id: number) {
     setProjetoLinks(prev => prev.filter(l => l.id !== id));
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!isCoverModalOpen) return;
      const file = e.clipboardData?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleCoverChange(file);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isCoverModalOpen]);

  async function uploadProjectCover(userId: string, projectId: string) {
    if (!coverFile) return null;

    setCoverUploading(true);
    try {
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "jpg";

      const filePath = `${userId}/${projectId}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-covers")
        .upload(filePath, coverFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: coverFile.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("project-covers").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl || null;

      return publicUrl;
    } finally {
      setCoverUploading(false);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    autofocus: false,
    immediatelyRender: false,
  });

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await getClientes();
        setClientes(data);
      } catch (err) {
        console.error("Erro ao buscar clientes:", err);
      }
    }
    fetchClientes();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    
    if (name === "orcamento") {
      let numericVal = value.replace(/\D/g, "");
      let asNumber = Number(numericVal) / 100;
      if (numericVal === "") {
         setForm(prev => ({ ...prev, orcamento: "" }));
         return;
      }
      
      const formatted = asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      setForm(prev => ({ ...prev, orcamento: formatted }));
      return;
    }
    
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : value,
    }));
  }

  function showPopup(message: string, type: "success" | "error" = "success") {
    setPopup({ message, type });
    setTimeout(() => setPopup({ message: "", type: null }), 2600);
  }

  async function criarPagamentos(projeto_id: string, user_id: string) {
    const valor = Number(form.orcamento.replace(/\D/g, "")) / 100;
    if (!valor || valor <= 0) return;

    const hoje = new Date().toISOString().slice(0, 10);

    if (form.forma_pagamento === "pix") {
      return await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor,
          forma_pagamento: "pix",
          parcela: 1,
          total_parcelas: 1,
          tipo: "único",
          status: form.ja_pago ? "pago" : "pendente",
          data_pagamento: form.ja_pago ? hoje : null,
          data_prevista: hoje,
        },
      ]);
    }

    if (form.forma_pagamento === "pix_2x") {
      const metade = valor / 2;

      await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor: metade,
          forma_pagamento: "pix_2x",
          parcela: 1,
          total_parcelas: 2,
          tipo: "entrada",
          status: "pago",
          data_pagamento: hoje,
          data_prevista: hoje,
        },
      ]);

      return await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor: metade,
          forma_pagamento: "pix_2x",
          parcela: 2,
          total_parcelas: 2,
          tipo: "restante",
          status: "pendente",
          data_prevista: form.prazo_entrega || null,
        },
      ]);
    }

    if (form.forma_pagamento === "cartao") {
      return await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor,
          forma_pagamento: "cartao",
          parcela: 1,
          total_parcelas: 1,
          tipo: "único",
          status: form.ja_pago ? "pago" : "pendente",
          data_pagamento: form.ja_pago ? hoje : null,
          data_prevista: hoje,
        },
      ]);
    }
  }

  function validarConclusaoAntes() {
    if (form.status !== "Concluído") return true;

    if (form.forma_pagamento === "pix_2x") {
      showPopup(
        "❌ O restante (50%) do pagamento ainda não foi feito. Não é possível concluir o projeto.",
        "error"
      );
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validarConclusaoAntes()) return;

    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) throw new Error("Usuário não autenticado");

      const descricaoJSON = editor ? editor.getJSON() : null;

      const { data, error } = await supabase
        .from("projetos")
        .insert([
          {
            titulo: form.titulo,
            descricao: descricaoJSON,
            cliente_id: form.cliente_id || null,
            tipo: form.tipo,
            orcamento: form.orcamento ? Number(form.orcamento.replace(/\D/g, "")) / 100 : null,
            data_inicio: form.data_inicio || null,
            prazo_entrega: form.prazo_entrega || null,
            status: form.status,
            progresso: 0,
            notas_internas: form.notas_internas || null,
            forma_pagamento: form.forma_pagamento,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (coverFile) {
        const publicUrl = await uploadProjectCover(user.id, data.id);
        if (publicUrl) {
          const { error: upErr } = await supabase
            .from("projetos")
            .update({ cover_url: publicUrl })
            .eq("id", data.id);

          if (upErr) {
            console.error(upErr);
            showPopup("⚠️ Projeto criado, mas falhou ao salvar a capa.", "error");
          }
        }
      }

      await criarPagamentos(data.id, user.id);

      if (collaboratorEmail.trim()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const splitVal = collaboratorSplitValue ? Number(collaboratorSplitValue) : undefined;
            const inviteRes = await fetch("/api/invites/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                project_id: data.id,
                invited_email: collaboratorEmail.trim(),
                split_type: collaboratorSplitType,
                split_value: splitVal,
                already_paid: collaboratorAlreadyPaid,
              }),
            });
            if (inviteRes.ok) {
              const inviteData = await inviteRes.json();
              if (inviteData.inviteLink) {
                setInviteLinkModal({ link: inviteData.inviteLink, email_sent: !!inviteData.email_sent });
              }
            }
          }
        } catch {
        }
      }

      const validTasks = tasks.filter(t => t.titulo.trim());
      for (const td of validTasks) {
        const { data: taskData, error: taskErr } = await supabase
          .from("tasks")
          .insert([{
            user_id: user.id,
            projeto_id: data.id,
            titulo: td.titulo.trim(),
            status: "para_fazer",
          }])
          .select()
          .single();
        if (taskErr) { console.warn("Erro ao criar task:", taskErr); continue; }
        const validSubs = td.subtasks.filter(s => s.titulo.trim());
        if (validSubs.length) {
          await supabase.from("subtasks").insert(
            validSubs.map(s => ({
              user_id: user.id,
              task_id: taskData.id,
              titulo: s.titulo.trim(),
              concluida: false,
            }))
          );
        }
      }

      const validLinks = projetoLinks.filter(l => l.url.trim());
      if (validLinks.length > 0) {
        await supabase.from("links_projeto").insert(
          validLinks.map(l => ({
            user_id: user.id,
            projeto_id: data.id,
            titulo: l.titulo.trim() || null,
            url: l.url.trim(),
          }))
        );
      }

      showPopup("✨ Projeto criado com sucesso!", "success");
      if (!collaboratorEmail.trim()) {
        setTimeout(() => router.push("/dashboard/projetos"), 1200);
      }
    } catch (err: any) {
      showPopup("Erro ao criar projeto: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    router.push("/dashboard/projetos");
  }

  function openLinkModal() {
    if (!editor) return;
    const attrs = editor.getAttributes("link");
    const currentHref = attrs?.href || "";
    setLinkUrl(currentHref);
    setLinkModalOpen(true);
  }

  function handleConfirmLink() {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setLinkModalOpen(false);
  }

  function handleRemoveLink() {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }

  const nextStep = () => {
    if (step === 1) {
      setAttemptedStep1(true);
      if (!form.titulo.trim() || !form.cliente_id || !coverFile) {
        showPopup("Preencha título, cliente e imagem de capa para prosseguir.", "error");
        return;
      }
    }
    if (step === 2) {
      setAttemptedStep2(true);
      if (!form.orcamento.trim() || !form.forma_pagamento) {
        showPopup("Preencha o orçamento e a forma de pagamento para prosseguir.", "error");
        return;
      }
      if (!form.status) {
         showPopup("O status inicial é obrigatório.", "error");
         return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  async function handleCreateClient() {
    if (!newClientForm.nome.trim()) return;
    if (newClientErrors.email || newClientErrors.telefone) {
      showPopup("Corrija os campos com erro antes de salvar.", "error");
      return;
    }
    setSavingClient(true);
    try {
      const created = await addCliente({
        nome: newClientForm.nome.trim(),
        empresa: newClientForm.empresa.trim() || null,
        email: newClientForm.email.trim() || null,
        telefone: newClientForm.telefone.trim() || null,
        foto_url: newClientFoto ?? null,
      } as any);
      setClientes(prev => [created, ...prev]);
      setForm(prev => ({ ...prev, cliente_id: created.id }));
      setNewClientModal(false);
      setNewClientForm({ nome: "", empresa: "", email: "", telefone: "", cpf_cnpj: "" });
      setNewClientFoto(null);
      setNewClientErrors({ email: "", telefone: "", cpf_cnpj: "" });
      showPopup("✅ Cliente criado e selecionado!", "success");
    } catch (err: any) {
      showPopup("Erro ao criar cliente: " + err.message, "error");
    } finally {
      setSavingClient(false);
    }
  }

  return (
    <>

      {popup.type && (
        <div
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:top-6 sm:right-6 px-5 py-3.5 sm:px-6 sm:py-4 rounded-lg shadow-lg z-[999] transition-all ${
            popup.type === "success"
              ? "bg-green-500 text-primary-900"
              : "bg-red-500 text-white"
          }`}
        >
          {popup.message}
        </div>
      )}

      {inviteLinkModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-primary-800 border border-primary-700 rounded-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <h2 className="text-[18px] text-primary-100 font-semibold">Convite gerado</h2>
            </div>

            {inviteLinkModal.email_sent ? (
              <p className="text-[13px] text-emerald-400">
                ✓ Email de convite enviado automaticamente para o colaborador.
              </p>
            ) : (
              <p className="text-[13px] text-gray-400">
                Copie o link abaixo e envie para o colaborador:
              </p>
            )}

            <div className="flex items-center gap-2 bg-primary-900 border border-primary-600 rounded-xl px-4 py-3">
              <span className="flex-1 text-[13px] text-gray-300 truncate">{inviteLinkModal.link}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLinkModal!.link);
                  setCopiedInviteLink(true);
                  setTimeout(() => setCopiedInviteLink(false), 2000);
                }}
                className="shrink-0 bg-primary-700 hover:bg-primary-600 border border-primary-600 text-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
              >
                {copiedInviteLink ? "✓ Copiado" : "Copiar"}
              </button>
            </div>

            <p className="text-[12px] text-gray-500">O link expira em 7 dias.</p>

            <button
              type="button"
              onClick={() => {
                setInviteLinkModal(null);
                router.push("/dashboard/projetos");
              }}
              className="mt-1 bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors"
            >
              Ir para projetos
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 gap-4 sm:gap-8 px-4 sm:px-6 lg:pl-0 lg:pr-6 py-4 sm:py-8 overflow-hidden">
        <header className="flex flex-col gap-1">
          <h1 className="text-[22px] sm:text-[32px] text-gray-200 font-semibold">Novo Projeto</h1>
          <p className="text-[14px] sm:text-[15px] text-gray-400">
            Preencha as etapas para cadastrar um novo projeto.
          </p>
        </header>

        {isCoverModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setIsCoverModalOpen(false)}>
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-primary-800 border border-primary-600 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="flex justify-between items-center w-full">
                <h2 className="text-[18px] text-gray-100 font-medium">Adicionar Imagem de Capa</h2>
                <button onClick={() => setIsCoverModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>

              <div
                className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors ${
                  isDraggingCover ? "border-primary-400 bg-primary-500/10" : "border-primary-600 bg-primary-900/50"
                }`}
                onDragOver={handleCoverDragOver}
                onDragLeave={handleCoverDragLeave}
                onDrop={handleCoverDrop}
              >
                <div className="w-16 h-16 rounded-full bg-primary-800 border border-primary-700 flex items-center justify-center mb-4 shadow-lg">
                  <UploadCloud size={32} className="text-primary-400" />
                </div>
                <div className="text-[16px] text-gray-200 font-medium text-center">
                  Cole, arraste e solte ou clique para adicionar sua imagem
                </div>
                <div className="text-[13px] text-gray-400 text-center mt-2 max-w-sm">
                  {IMAGE_SPECS.card.hint} • PNG, JPG ou WEBP.
                </div>
                
                <label className="mt-6 px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold cursor-pointer transition-colors">
                  Escolher arquivo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleCoverChange(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        <section className="flex-1 overflow-y-auto pr-0 sm:pr-2 pb-4 custom-scrollbar">
          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-4 sm:p-8 flex flex-col gap-5 sm:gap-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] sm:text-[20px] text-gray-300 font-medium">
                {step === 1 && "Etapa 1 de 4 – Informações básicas"}
                {step === 2 && "Etapa 2 de 4 – Escopo, prazos e pagamento"}
                {step === 3 && "Etapa 3 de 4 – Links e observações"}
                {step === 4 && "Etapa 4 de 4 – Tarefas do projeto"}
              </h2>
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Capa e Título do projeto *</span>
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => setIsCoverModalOpen(true)}
                      title="Adicionar/Trocar capa"
                      className={`w-[56px] h-[56px] shrink-0 rounded-xl border-2 hover:bg-primary-800/60 overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors group relative ${
                        attemptedStep1 && !coverFile ? "border-red-500 bg-red-500/10 border-solid" : "border-dashed border-primary-600 bg-primary-900/40"
                      }`}
                    >
                      {coverPreview ? (
                        <>
                          <img
                            src={coverPreview}
                            alt="Capa do projeto"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ImageIcon className="text-white" size={16} />
                          </div>
                        </>
                      ) : (
                        <ImageIcon className={`transition-colors ${attemptedStep1 && !coverFile ? "text-red-400" : "text-primary-500 group-hover:text-primary-400"}`} size={24} />
                      )}
                    </div>

                    <input
                      type="text"
                      name="titulo"
                      value={form.titulo}
                      onChange={handleChange}
                      placeholder="Ex: Site institucional Lucro Rural"
                      className={`flex-1 h-[56px] bg-primary-900 border rounded-xl px-4 text-[15px] text-gray-100 placeholder-gray-500 transition-colors ${
                        attemptedStep1 && !form.titulo.trim() ? "border-red-500 focus:outline-red-500" : "border-primary-700"
                      }`}
                    />
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Cliente vinculado *</span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        name="cliente_id"
                        value={form.cliente_id ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            cliente_id: e.target.value === "" ? null : e.target.value,
                          }))
                        }
                        className={`flow-select w-full bg-primary-900 border rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer transition-colors ${
                          attemptedStep1 && !form.cliente_id ? "border-red-500 focus:outline-red-500" : "border-primary-700"
                        }`}
                      >
                        <option value="">Selecione um cliente...</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} {c.empresa ? `- ${c.empresa}` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown />
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewClientModal(true)}
                      title="Criar novo cliente"
                      className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-primary-700 border border-primary-600 text-gray-200 hover:bg-primary-600 transition-colors text-[13px] whitespace-nowrap"
                    >
                      <UserPlus size={16} />
                      Novo cliente
                    </button>
                  </div>
                </label>

                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[13px] text-gray-300">
                    Descrição do projeto
                  </span>

                  <div className="bg-primary-900 border border-primary-700 rounded-xl overflow-hidden">
                    {editor && (
                      <EditorToolbar
                        editor={editor}
                        onOpenLinkModal={openLinkModal}
                        onRemoveLink={handleRemoveLink}
                      />
                    )}

                    <div className="border-t border-primary-700">
                      {editor && (
                        <EditorContent
                          editor={editor}
                          className="tiptap px-4 py-3 text-[15px] text-gray-100 custom-editor"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Orçamento *</span>
                  <input
                    type="text"
                    name="orcamento"
                    value={form.orcamento}
                    onChange={handleChange}
                    placeholder="R$ 0,00"
                    className={`w-full bg-primary-900 border rounded-xl px-4 py-3 text-[15px] text-gray-100 transition-colors ${
                      attemptedStep2 && !form.orcamento.trim() ? "border-red-500 focus:outline-red-500" : "border-primary-700"
                    }`}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Forma de pagamento *</span>
                  <div className="relative">
                    <select
                      name="forma_pagamento"
                      value={form.forma_pagamento}
                      onChange={handleChange}
                      className={`flow-select w-full bg-primary-900 border rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer transition-colors ${
                        attemptedStep2 && !form.forma_pagamento ? "border-red-500 focus:outline-red-500 text-gray-400" : "border-primary-700"
                      }`}
                    >
                      <option value="" disabled hidden>Selecione a forma de pagamento...</option>
                      <option value="pix" className="text-gray-100">Pix à vista</option>
                      <option value="pix_2x" className="text-gray-100">Pix 2× (50% entrada, 50% entrega)</option>
                      <option value="cartao" className="text-gray-100">Cartão de crédito</option>
                    </select>
                    <ChevronDown />
                  </div>
                </label>

                {(form.forma_pagamento === "pix" || form.forma_pagamento === "cartao") && (
                  <div className="flex items-center gap-6 mt-1">
                    <span className="text-[14px] text-gray-300 font-medium">Pago?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, ja_pago: false }))}
                        className={`px-4 py-2 rounded-xl border text-[13px] font-medium transition-colors ${!form.ja_pago ? "bg-primary-600 border-primary-500 text-white" : "bg-primary-900 border-primary-700 text-gray-400 hover:border-primary-600"}`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, ja_pago: true }))}
                        className={`px-4 py-2 rounded-xl border text-[13px] font-medium transition-colors ${form.ja_pago ? "bg-emerald-600 border-emerald-500 text-white" : "bg-primary-900 border-primary-700 text-gray-400 hover:border-primary-600"}`}
                      >
                        Sim
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-300">Data de início</label>
                    <DatePicker
                      value={form.data_inicio}
                      onChange={(v) => setForm((p) => ({ ...p, data_inicio: v }))}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-300">Prazo de entrega</label>
                    <DatePicker
                      value={form.prazo_entrega}
                      onChange={(v) => setForm((p) => ({ ...p, prazo_entrega: v }))}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Status inicial</span>
                  <div className="relative">
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                    >
                      <option value="Para fazer">Para fazer</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Arquivado">Arquivado</option>
                    </select>
                    <ChevronDown />
                  </div>
                </label>

                <div className="flex flex-col gap-3 pt-2 border-t border-primary-700">
                  <span className="text-[13px] text-gray-300">Colaborador <span className="text-gray-500">(opcional)</span></span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[12px] text-gray-400">E-mail do colaborador</span>
                      <input
                        type="email"
                        value={collaboratorEmail}
                        onChange={(e) => setCollaboratorEmail(e.target.value)}
                        placeholder="colaborador@email.com"
                        className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                      />
                    </label>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12px] text-gray-400">Divisão</span>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <select
                            value={collaboratorSplitType}
                            onChange={(e) => setCollaboratorSplitType(e.target.value as "percentage" | "fixed")}
                            className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                          >
                            <option value="percentage">% do total</option>
                            <option value="fixed">Valor fixo (R$)</option>
                          </select>
                          <ChevronDown />
                        </div>
                        <input
                          type="number"
                          min="0"
                          step={collaboratorSplitType === "percentage" ? "1" : "0.01"}
                          max={collaboratorSplitType === "percentage" ? "100" : undefined}
                          placeholder={collaboratorSplitType === "percentage" ? "50" : "2500"}
                          value={collaboratorSplitValue}
                          onChange={(e) => setCollaboratorSplitValue(e.target.value)}
                          className="w-28 bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100 focus:outline-none focus:border-primary-500"
                        />
                        <span className="text-gray-400 text-[14px] shrink-0">
                          {collaboratorSplitType === "percentage" ? "%" : "R$"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] text-gray-400">Colaborador já foi pago?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCollaboratorAlreadyPaid(false)}
                        className={`px-4 py-2 rounded-xl border text-[13px] font-medium transition-colors ${!collaboratorAlreadyPaid ? "bg-primary-600 border-primary-500 text-white" : "bg-primary-900 border-primary-700 text-gray-400 hover:border-primary-600"}`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollaboratorAlreadyPaid(true)}
                        className={`px-4 py-2 rounded-xl border text-[13px] font-medium transition-colors ${collaboratorAlreadyPaid ? "bg-emerald-600 border-emerald-500 text-white" : "bg-primary-900 border-primary-700 text-gray-400 hover:border-primary-600"}`}
                      >
                        Sim
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-500">Um convite será enviado automaticamente ao criar o projeto. O colaborador verá apenas o valor que cabe a ele.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <span className="text-[13px] text-gray-300">Links importantes do projeto (opcional)</span>
                  
                  {projetoLinks.map((link) => (
                    <div key={link.id} className="flex items-center gap-3">
                       <input 
                         type="text"
                         placeholder="Título (ex: Figma, Drive)"
                         value={link.titulo}
                         onChange={(e) => updateLink(link.id, "titulo", e.target.value)}
                         className="flex-1 bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100"
                       />
                       <input 
                         type="text"
                         placeholder="URL (https://...)"
                         value={link.url}
                         onChange={(e) => updateLink(link.id, "url", e.target.value)}
                         className="flex-[2] bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[14px] text-gray-100"
                       />
                       <button
                         type="button"
                         onClick={() => removeLink(link.id)}
                         className="p-3 text-gray-500 hover:text-red-400 bg-primary-800 hover:bg-primary-700 rounded-xl transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addLink}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary-600 text-primary-400 hover:bg-primary-800/50 hover:text-primary-300 transition-colors text-[14px] w-fit mt-2"
                  >
                    <Plus size={16} /> Adicionar link
                  </button>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Notas internas (opcional)</span>
                  <textarea
                    name="notas_internas"
                    rows={4}
                    value={form.notas_internas}
                    onChange={handleChange}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100 resize-none"
                    placeholder="Anotações visíveis apenas para a equipe"
                  />
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] text-gray-400">
                  Adicione tarefas e subtarefas que estarão vinculadas ao projeto.
                  Elas aparecerão na aba <strong className="text-gray-200">Etapas</strong> da página do projeto.
                </p>

                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-primary-900 border border-primary-700 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <ChevRight size={16} className="text-primary-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Nome da tarefa"
                          value={task.titulo}
                          onChange={e => updateTask(task.id, e.target.value)}
                          className="flex-1 bg-transparent border-b border-primary-700 focus:border-primary-400 outline-none px-1 py-1 text-[15px] text-gray-100 placeholder-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="pl-6 flex flex-col gap-2">
                        {task.subtasks.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                            <input
                              type="text"
                              placeholder="Subtarefa"
                              value={sub.titulo}
                              onChange={e => updateSubtask(task.id, sub.id, e.target.value)}
                              className="flex-1 bg-transparent border-b border-primary-800 focus:border-primary-600 outline-none px-1 py-0.5 text-[14px] text-gray-300 placeholder-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => removeSubtask(task.id, sub.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addSubtask(task.id)}
                          className="flex items-center gap-1 text-[13px] text-primary-400 hover:text-primary-300 transition-colors w-fit"
                        >
                          <Plus size={13} /> Adicionar subtarefa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTask}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary-600 text-primary-400 hover:bg-primary-800/50 hover:text-primary-300 transition-colors text-[14px]"
                >
                  <Plus size={16} /> Adicionar tarefa
                </button>
              </div>
            )}

            <div className="mt-4">
              <div className="w-full h-2 bg-primary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-500 ease-out"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between mt-6 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleCancelar}
                className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-2.5 px-4 sm:py-3 sm:px-6 text-[13.5px] sm:text-[15px] hover:bg-primary-700"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-2.5 px-4 sm:py-3 sm:px-6 text-[13.5px] sm:text-[15px] hover:bg-primary-700"
                  >
                    ← Voltar
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-2.5 px-4 sm:py-3 sm:px-6 text-[13.5px] sm:text-[15px]"
                  >
                    Próximo →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || coverUploading}
                    className={`bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-2.5 px-4 sm:py-3 sm:px-6 text-[13.5px] sm:text-[15px] ${
                      loading || coverUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading || coverUploading ? "Salvando..." : "Concluir cadastro"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {newClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setNewClientModal(false)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-primary-800 border border-primary-600 shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6 flex flex-col gap-5"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-[18px] text-gray-100 font-semibold">Novo cliente</h2>

            <div className="bg-primary-900/50 border border-primary-700 rounded-xl p-4 flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-primary-700 overflow-hidden bg-primary-800 flex items-center justify-center">
                  {newClientFoto
                    ? <Image src={newClientFoto} alt="Foto" width={64} height={64} className="object-cover w-full h-full" />
                    : <User size={28} className="text-primary-600" />}
                </div>
                <label className="absolute bottom-0 right-0 p-1.5 bg-primary-500 rounded-full text-primary-900 cursor-pointer hover:bg-primary-400 transition-colors">
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={uploadNewClientFoto} disabled={uploadingClientFoto} />
                  {uploadingClientFoto
                    ? <div className="w-3 h-3 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                    : <Pencil size={10} strokeWidth={3} />}
                </label>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-200">Foto de Perfil</span>
                <span className="text-xs text-gray-500">JPG, PNG ou WebP. Máx. 1 MB.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Nome Completo *</label>
                <input
                  autoFocus
                  type="text"
                  name="nome"
                  value={newClientForm.nome}
                  onChange={handleNewClientChange}
                  placeholder="Ex: João Silva"
                  className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  value={newClientForm.empresa}
                  onChange={handleNewClientChange}
                  placeholder="Ex: Acme Corp"
                  className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">CPF / CNPJ</label>
                <input
                  type="text"
                  name="cpf_cnpj"
                  value={newClientForm.cpf_cnpj}
                  onChange={handleNewClientChange}
                  placeholder="000.000.000-00"
                  className={`bg-primary-900 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none transition-all border ${
                    newClientErrors.cpf_cnpj ? "border-red-500" : "border-primary-700 focus:border-primary-500"
                  }`}
                />
                {newClientErrors.cpf_cnpj && <span className="text-red-400 text-xs">{newClientErrors.cpf_cnpj}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={newClientForm.email}
                  onChange={handleNewClientChange}
                  placeholder="exemplo@email.com"
                  className={`bg-primary-900 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none transition-all border ${
                    newClientErrors.email ? "border-red-500" : "border-primary-700 focus:border-primary-500"
                  }`}
                />
                {newClientErrors.email && <span className="text-red-400 text-xs">{newClientErrors.email}</span>}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Telefone</label>
                <div className="flex gap-2">
                  <div className="relative w-[88px]">
                    <select
                      value={newClientCountry.code}
                      onChange={handleNewClientCountry}
                      className="w-full appearance-none bg-primary-900 border border-primary-700 text-gray-200 rounded-xl h-[42px] pl-2 pr-5 text-sm focus:outline-none focus:border-primary-500 transition-all cursor-pointer"
                    >
                      {CLIENT_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]">▼</span>
                  </div>
                  <input
                    type="text"
                    name="telefone"
                    value={newClientForm.telefone}
                    onChange={handleNewClientChange}
                    placeholder={`${newClientCountry.dial} ...`}
                    className={`flex-1 bg-primary-900 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none transition-all border h-[42px] ${
                      newClientErrors.telefone ? "border-red-500" : "border-primary-700 focus:border-primary-500"
                    }`}
                  />
                </div>
                {newClientErrors.telefone && <span className="text-red-400 text-xs">{newClientErrors.telefone}</span>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-primary-700">
              <button
                type="button"
                onClick={() => setNewClientModal(false)}
                className="px-4 py-2 rounded-xl bg-primary-800 border border-primary-600 text-gray-200 text-[14px] hover:bg-primary-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateClient}
                disabled={savingClient || !newClientForm.nome.trim()}
                className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[14px] disabled:opacity-50"
              >
                {savingClient ? "Salvando..." : "Criar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-primary-800 border border-primary-600 shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6">
            <h2 className="text-[18px] text-gray-100 font-semibold mb-3">
              Inserir link
            </h2>
            <p className="text-[14px] text-gray-300 mb-4">
              Cole a URL que deseja vincular ao texto selecionado.
            </p>

            <input
              autoFocus
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-primary-900 border border-primary-700 rounded-lg px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 mb-5"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-primary-800 border border-primary-600 text-gray-200 text-[14px] hover:bg-primary-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[14px]"
              >
                Aplicar link
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-500);
          border-radius: 9999px;
          border: 2px solid var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-400);
        }

        .tiptap {
          min-height: 80px;
          outline: none;
        }
        .tiptap p {
          margin-bottom: 0.4rem;
        }
        .tiptap h1 {
          font-size: 1.4rem;
          font-weight: 600;
          margin: 0.75rem 0 0.4rem;
        }
        .tiptap h2 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0.7rem 0 0.35rem;
        }
        .tiptap h3 {
          font-size: 1.05rem;
          font-weight: 600;
          margin: 0.6rem 0 0.3rem;
        }
        .tiptap ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }
        .tiptap blockquote {
          border-left: 3px solid rgba(148, 163, 184, 0.8);
          padding-left: 0.75rem;
          margin: 0.5rem 0;
          color: #e5e7eb;
          font-style: italic;
        }
        .tiptap a {
          color: #38bdf8;
          text-decoration: underline;
        }

        .flow-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: none;
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

function ChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EditorToolbar({
  editor,
  onOpenLinkModal,
  onRemoveLink,
}: {
  editor: Editor;
  onOpenLinkModal: () => void;
  onRemoveLink: () => void;
}) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      forceUpdate((v) => v + 1);
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("update", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("update", update);
    };
  }, [editor]);

  if (!editor) return null;

  const isActiveClass = (fn: () => boolean) =>
    fn()
      ? "bg-primary-700 text-primary-100"
      : "text-gray-300";

  const buttonBase =
    "px-2.5 py-1.5 text-[13px] rounded-md border border-transparent hover:bg-primary-800 flex items-center justify-center gap-1";

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : "p";

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary-900/80">
      <select
        className="bg-primary-800 border border-primary-700 rounded-md px-3 pr-7 py-1.5 text-[13px] text-gray-100 cursor-pointer"
        value={headingValue}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "h1") {
            editor.chain().focus().setHeading({ level: 1 }).run();
          } else if (value === "h2") {
            editor.chain().focus().setHeading({ level: 2 }).run();
          } else if (value === "h3") {
            editor.chain().focus().setHeading({ level: 3 }).run();
          } else {
            editor.chain().focus().setParagraph().run();
          }
        }}
      >
        <option value="p">Normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
      </select>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("bold"))}`}
      >
        <span className="font-semibold">B</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("italic"))}`}
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("underline"))}`}
      >
        <span className="underline">U</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("strike"))}`}
      >
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("bulletList"))}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="7" r="1.4" />
          <circle cx="6" cy="12" r="1.4" />
          <circle cx="6" cy="17" r="1.4" />
          <line x1="10" y1="7" x2="18" y2="7" />
          <line x1="10" y1="12" x2="18" y2="12" />
          <line x1="10" y1="17" x2="18" y2="17" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("orderedList"))}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 6l1.2-2H4" />
          <path d="M5 11h1" />
          <path d="M4.5 16.5h2L4.5 19h2" />
          <line x1="10" y1="7" x2="18" y2="7" />
          <line x1="10" y1="12" x2="18" y2="12" />
          <line x1="10" y1="17" x2="18" y2="17" />
        </svg>
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("blockquote"))}`}
      >
        <span className="text-[12px]">“”</span>
      </button>

      <button
        type="button"
        onClick={onOpenLinkModal}
        className={`${buttonBase} ${
          editor.isActive("link")
            ? "bg-primary-700 text-primary-100"
            : "text-gray-300"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 12.75 13 8.25a2.5 2.5 0 1 1 3.54 3.54l-6.01 6.01a3.75 3.75 0 1 1-5.3-5.3l4.25-4.25" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onRemoveLink}
        className={buttonBase + " text-gray-400 hover:text-primary-100"}
      >
        <span className="text-[11px]">Remover</span>
      </button>
    </div>
  );
}
