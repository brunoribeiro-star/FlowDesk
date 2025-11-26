"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { addCliente } from "@/lib/supabaseQueries/clientes";

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

  // --------------------------
  // VALIDAÇÕES
  // --------------------------
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
      // CPF
      digits = digits.slice(0, 11);
      return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    // CNPJ
    digits = digits.slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  // --------------------------
  // SELECT DE PAÍS (DDD)
  // --------------------------
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

  // --------------------------
  // CAMPOS
  // --------------------------
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

  // --------------------------
  // FOTO
  // --------------------------
  async function enviarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Usuário não autenticado!");
        return;
      }

      const path = `clientes/${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file);

      if (uploadError) {
        alert("Erro ao enviar imagem: " + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      setFotoUrl(urlData.publicUrl);
    } catch (err: any) {
      alert("Erro ao enviar foto: " + err.message);
    }

    setUploadingImage(false);
  }

  function removerFoto() {
    setFotoUrl(null);
  }

  // --------------------------
  // SUBMIT
  // --------------------------
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

  // --------------------------
  // UI
  // --------------------------
  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">

        {/* BOTÃO VOLTAR */}
        <button
          type="button"
          onClick={() => router.push("/dashboard/clientes")}
          className="flex items-center gap-2 text-gray-300 hover:text-primary-200 transition-colors w-fit"
        >
          <span className="text-[20px]">←</span>
          <span className="text-[16px]">Voltar</span>
        </button>

        <header>
          <h1 className="text-[32px] text-gray-200 font-semibold">Novo Cliente</h1>
          <p className="text-[18px] text-gray-300">
            Adicione um novo cliente ao seu portfólio.
          </p>
        </header>

        {/* FORM */}
        <section className="flex-1 bg-primary-800 border border-primary-700 rounded-lg p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-2xl mx-auto">

            {/* FOTO */}
            <div className="flex flex-col gap-3">
              <span className="text-[18px] text-gray-200">Foto do cliente (opcional)</span>

              <div className="flex items-center gap-6">

                <div className="w-[110px] h-[110px] rounded-full border border-primary-600 overflow-hidden bg-primary-900 flex items-center justify-center">
                  {fotoUrl ? (
                    <Image src={fotoUrl} alt="Foto" width={110} height={110} className="object-cover" />
                  ) : (
                    <span className="text-gray-500 text-[40px]">👤</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="bg-primary-700 border border-primary-600 rounded-lg px-4 py-2 cursor-pointer hover:bg-primary-600 text-[15px]">
                    <span className="text-primary-100">
                      {uploadingImage ? "Enviando..." : "Enviar foto"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={enviarFoto}
                      disabled={uploadingImage}
                    />
                  </label>

                  {fotoUrl && (
                    <button
                      type="button"
                      onClick={removerFoto}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* NOME */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">Nome completo *</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                className="h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-5 text-gray-100"
              />
            </div>

            {/* EMPRESA */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">Empresa</label>
              <input
                type="text"
                name="empresa"
                value={form.empresa}
                onChange={handleChange}
                className="h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-5 text-gray-100"
              />
            </div>

            {/* CPF / CNPJ */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">CPF / CNPJ</label>
              <input
                type="text"
                name="cpf_cnpj"
                value={form.cpf_cnpj}
                onChange={handleChange}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className={`h-[58px] rounded-lg bg-primary-900 border px-5 text-gray-100 ${
                  errors.cpf_cnpj ? "border-red-500" : "border-primary-700"
                }`}
              />
              {errors.cpf_cnpj && (
                <span className="text-red-400 text-[14px]">{errors.cpf_cnpj}</span>
              )}
            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`h-[58px] rounded-lg bg-primary-900 border px-5 text-gray-100 ${
                  errors.email ? "border-red-500" : "border-primary-700"
                }`}
              />
              {errors.email && (
                <span className="text-red-400 text-[14px]">{errors.email}</span>
              )}
            </div>

            {/* TELEFONE */}
            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">Telefone</label>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={country.code}
                    onChange={handleCountryChange}
                    className="appearance-none bg-primary-900 border border-primary-700 text-gray-100 rounded-lg h-[58px] pl-4 pr-10 text-[16px] cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                    ▼
                  </span>
                </div>

                <input
                  type="text"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder={`${country.dial} ...`}
                  className={`h-[58px] flex-1 rounded-lg bg-primary-900 border px-5 text-gray-100 ${
                    errors.telefone ? "border-red-500" : "border-primary-700"
                  }`}
                />
              </div>

              {errors.telefone && (
                <span className="text-red-400 text-[14px]">{errors.telefone}</span>
              )}
            </div>

            {/* BOTÕES */}
            <div className="flex items-center justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => router.push("/dashboard/clientes")}
                className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 px-6 text-[20px]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`bg-primary-500 text-primary-900 rounded-lg py-3 px-6 text-[20px] font-semibold ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Salvando..." : "Salvar Cliente"}
              </button>
            </div>

          </form>
        </section>
      </div>
    </div>
  );
}
