"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { addCliente } from "@/lib/supabaseQueries/clientes";
import { validateImageFile } from "@/lib/utils";
import { IMAGE_SPECS } from "@/lib/imageSpecs";
import { useImageConverter } from "@/hooks/useImageConverter";
import ImageConverterModal from "@/components/ui/ImageConverterModal";
import { User, Pencil } from "lucide-react";
import HeaderProfile from "@/components/HeaderProfile";

const COUNTRIES = [
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
];

export default function NovoClientePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const { converterState, triggerConverter, cancelConverter } = useImageConverter();

  const [country, setCountry] = useState(COUNTRIES[0]);

  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    cpf_cnpj: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    telefone: "",
    cpf_cnpj: "",
  });

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

  const maskPhoneBR = (value: string) => {
    let digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7)
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const maskCpfCnpj = (value: string) => {
    let digits = value.replace(/\D/g, "");

    if (digits.length <= 11) {
      digits = digits.slice(0, 11);
      return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    digits = digits.slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = COUNTRIES.find((c) => c.code === e.target.value);
    if (!selected) return;

    setCountry(selected);

    setForm((prev) => ({
      ...prev,
      telefone: selected.code === "BR" ? `${selected.dial} ` : `${selected.dial} `,
    }));

    setErrors((prev) => ({
      ...prev,
      telefone: "",
    }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === "email") {
      setErrors((prev) => ({
        ...prev,
        email: value && !validateEmail(value) ? "E-mail inválido" : "",
      }));
    }

    if (name === "cpf_cnpj") {
      const masked = maskCpfCnpj(value);
      setForm({ ...form, cpf_cnpj: masked });

      setErrors((prev) => ({
        ...prev,
        cpf_cnpj: masked.length < 14 ? "CPF/CNPJ inválido" : "",
      }));
      return;
    }

    if (name === "telefone") {
      let masked = value;
      if (country.code === "BR") {
        masked = value.replace(country.dial, "").trim();
        masked = maskPhoneBR(masked);
        setErrors((prev) => ({
          ...prev,
          telefone:
            masked.replace(/\D/g, "").length !== 11
              ? "Telefone inválido"
              : "",
        }));
        return setForm({
          ...form,
          telefone: `${country.dial} ${masked}`,
        });
      }
      return setForm({ ...form, telefone: value });
    }

    setForm({ ...form, [name]: value });
  }

  async function doUploadFoto(file: File) {
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Usuário não autenticado!"); return; }
      const path = `clientes/${user.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
      if (uploadError) { alert("Erro ao enviar imagem: " + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setFotoUrl(urlData.publicUrl);
    } catch (err: any) {
      alert("Erro ao enviar foto: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function enviarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerConverter(file, IMAGE_SPECS.avatar, doUploadFoto);
    e.target.value = "";
  }

  function removerFoto() {
    setFotoUrl(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.nome.trim()) return alert("O nome do cliente é obrigatório.");
    if (errors.email) return alert("Corrija o e-mail antes de salvar.");
    if (errors.telefone) return alert("Corrija o telefone antes de salvar.");
    if (errors.cpf_cnpj) return alert("Corrija o CPF/CNPJ antes de salvar.");

    setLoading(true);

    try {
      await addCliente({
        ...form,
        foto_url: fotoUrl ?? null,
      });

      alert("Cliente criado com sucesso!");
      router.push("/dashboard/clientes");
    } catch (err: any) {
      alert("Erro ao criar cliente: " + err.message);
    }

    setLoading(false);
  }

  return (
    <div className="h-screen w-full bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full h-screen overflow-hidden">

        <div className="flex items-center justify-between shrink-0 mb-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/clientes")}
            className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors w-fit group"
          >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
            <span className="text-sm font-medium">Voltar para Clientes</span>
          </button>
          
          <HeaderProfile />
        </div>

        <header className="shrink-0">
          <h1 className="text-2xl text-gray-100 font-bold mb-1">Novo Cliente</h1>
          <p className="text-sm text-gray-400">
            Adicione um novo cliente ao seu portfólio.
          </p>
        </header>

        <section className="flex-1 bg-primary-900 border border-primary-800 rounded-2xl p-6 overflow-y-auto shadow-sm w-full">
          <form id="cliente-form" onSubmit={handleSubmit} className="flex flex-col gap-6 w-full h-full">
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col gap-6">
                    <div className="bg-transparent border border-primary-700 rounded-xl p-4 flex items-center gap-6">
                        <div className="relative group shrink-0">
                            <div className="w-20 h-20 rounded-full border-2 border-primary-700 overflow-hidden bg-primary-800 flex items-center justify-center shadow-lg">
                            {fotoUrl ? (
                                <Image src={fotoUrl} alt="Foto" width={80} height={80} className="object-cover w-full h-full" />
                            ) : (
                                <User size={32} className="text-primary-600" />
                            )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-1.5 bg-primary-500 rounded-full text-primary-900 cursor-pointer shadow-lg hover:bg-primary-400 transition-colors">
                                <input
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={enviarFoto}
                                disabled={uploadingImage}
                                />
                                {uploadingImage ? (
                                    <div className="w-3 h-3 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Pencil size={10} strokeWidth={3} />
                                )}
                            </label>
                        </div>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-medium text-gray-200">Foto de Perfil</h3>
                            <p className="text-xs text-gray-500">{IMAGE_SPECS.avatar.hint}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nome Completo *</label>
                        <input
                            type="text"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            placeholder="Ex: João Silva"
                            className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600 text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Empresa</label>
                        <input
                            type="text"
                            name="empresa"
                            value={form.empresa}
                            onChange={handleChange}
                            placeholder="Ex: Acme Corp"
                            className="bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-600 text-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">CPF / CNPJ</label>
                        <input
                            type="text"
                            name="cpf_cnpj"
                            value={form.cpf_cnpj}
                            onChange={handleChange}
                            placeholder="000.000.000-00"
                            className={`bg-transparent border rounded-xl px-4 py-3 text-gray-200 focus:outline-none transition-all placeholder:text-gray-600 text-sm ${
                            errors.cpf_cnpj 
                                ? "border-red-500 focus:border-red-500" 
                                : "border-primary-700 focus:border-primary-500"
                            }`}
                        />
                         {errors.cpf_cnpj && <span className="text-red-400 text-xs">{errors.cpf_cnpj}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">E-mail</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="exemplo@email.com"
                            className={`bg-transparent border rounded-xl px-4 py-3 text-gray-200 focus:outline-none transition-all placeholder:text-gray-600 text-sm ${
                            errors.email 
                                ? "border-red-500 focus:border-red-500" 
                                : "border-primary-700 focus:border-primary-500"
                            }`}
                        />
                        {errors.email && <span className="text-red-400 text-xs">{errors.email}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Telefone</label>
                        <div className="flex gap-2">
                            <div className="relative w-[90px]">
                                <select
                                    value={country.code}
                                    onChange={handleCountryChange}
                                    className="w-full appearance-none bg-transparent border border-primary-700 text-gray-200 rounded-xl h-[46px] pl-2 pr-6 text-sm focus:outline-none focus:border-primary-500 transition-all cursor-pointer"
                                >
                                    {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.flag} {c.dial}
                                    </option>
                                    ))}
                                </select>
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]">▼</span>
                            </div>

                            <input
                                type="text"
                                name="telefone"
                                value={form.telefone}
                                onChange={handleChange}
                                placeholder={`${country.dial} ...`}
                                className={`flex-1 bg-transparent border rounded-xl px-4 py-3 text-gray-200 focus:outline-none transition-all placeholder:text-gray-600 text-sm h-[46px] ${
                                errors.telefone 
                                    ? "border-red-500 focus:border-red-500" 
                                    : "border-primary-700 focus:border-primary-500"
                                }`}
                            />
                        </div>
                        {errors.telefone && <span className="text-red-400 text-xs">{errors.telefone}</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-auto border-t border-primary-800">
              <button
                type="button"
                onClick={() => router.push("/dashboard/clientes")}
                className="px-6 py-2.5 rounded-xl bg-transparent border border-primary-700 text-gray-300 hover:bg-primary-800 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2.5 rounded-xl bg-primary-500 text-primary-900 font-bold hover:bg-primary-400 transition-colors text-sm shadow-lg shadow-primary-500/20 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Salvando..." : "Salvar Cliente"}
              </button>
            </div>

          </form>
        </section>
      </div>
      {converterState && (
        <ImageConverterModal
          file={converterState.file}
          spec={converterState.spec}
          onAccept={converterState.onAccept}
          onCancel={() => cancelConverter()}
        />
      )}
    </div>
  );
}
