"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const COUNTRIES = [
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" }
];

export default function CreateClienteModal({
  open,
  onClose,
  onComplete
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (client: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [country, setCountry] = useState(COUNTRIES[0]);

  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    cpf_cnpj: ""
  });

  const [errors, setErrors] = useState({
    email: "",
    telefone: "",
    cpf_cnpj: ""
  });

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

  const maskPhoneBR = (value: string) => {
    let digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
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

  function handleChange(e: any) {
    const { name, value } = e.target;

    if (name === "email") {
      setErrors((prev) => ({
        ...prev,
        email: value && !validateEmail(value) ? "E-mail inválido" : ""
      }));
      return setForm({ ...form, email: value });
    }

    if (name === "cpf_cnpj") {
      const masked = maskCpfCnpj(value);
      setErrors((prev) => ({
        ...prev,
        cpf_cnpj: masked.length < 14 ? "CPF/CNPJ inválido" : ""
      }));
      return setForm({ ...form, cpf_cnpj: masked });
    }

    if (name === "telefone") {
      let masked = value;

      if (country.code === "BR") {
        masked = value.replace(country.dial, "").trim();
        masked = maskPhoneBR(masked);
        setErrors((prev) => ({
          ...prev,
          telefone: masked.replace(/\D/g, "").length !== 11 ? "Telefone inválido" : ""
        }));
        return setForm({ ...form, telefone: `${country.dial} ${masked}` });
      }

      return setForm({ ...form, telefone: value });
    }

    setForm({ ...form, [name]: value });
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
  const selected = COUNTRIES.find((c) => c.code === e.target.value);
  if (!selected) return;

  setCountry(selected);

  setForm((prev) => ({
    ...prev,
    telefone: `${selected.dial} `
  }));

  setErrors((prev) => ({
    ...prev,
    telefone: ""
  }));
}

  async function enviarFoto(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      setUploadingImage(false);
      return;
    }

    const path = `clientes/${user.id}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file);

    if (error) {
      alert("Erro ao enviar imagem: " + error.message);
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    setFotoUrl(urlData.publicUrl);
    setUploadingImage(false);
  }

  async function submit() {
    if (!form.nome.trim()) return alert("O nome do cliente é obrigatório.");
    if (errors.email || errors.telefone || errors.cpf_cnpj)
      return alert("Corrija os erros antes de salvar.");

    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert([
        {
          user_id: user.id,
          nome: form.nome,
          empresa: form.empresa || null,
          email: form.email || null,
          telefone: form.telefone || null,
          cpf_cnpj: form.cpf_cnpj || null,
          foto_url: fotoUrl || null
        }
      ])
      .select("*")
      .single();

    setLoading(false);

    if (error) {
      alert("Erro ao salvar cliente: " + error.message);
      return;
    }

    onComplete(data);
    onClose();

    setForm({ nome: "", empresa: "", email: "", telefone: "", cpf_cnpj: "" });
    setFotoUrl(null);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-xl p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-xl"
        >
          ×
        </button>

        <h2 className="text-2xl font-semibold mb-6">Novo Cliente</h2>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <div className="w-[70px] h-[70px] rounded-full border border-primary-600 overflow-hidden bg-primary-800 flex items-center justify-center">
              {fotoUrl ? (
                <img src={fotoUrl} className="object-cover w-full h-full" />
              ) : (
                <span className="text-gray-500 text-3xl">👤</span>
              )}
            </div>

            <label className="bg-primary-700 border border-primary-600 rounded-lg px-4 py-2 cursor-pointer hover:bg-primary-600 text-sm">
              <span>{uploadingImage ? "Enviando..." : "Enviar foto"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={enviarFoto}
                disabled={uploadingImage}
              />
            </label>
          </div>

          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Nome completo *"
            className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-sm"
          />

          <input
            name="empresa"
            value={form.empresa}
            onChange={handleChange}
            placeholder="Empresa"
            className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-sm"
          />

          <input
            name="cpf_cnpj"
            value={form.cpf_cnpj}
            onChange={handleChange}
            placeholder="CPF/CNPJ"
            className={`bg-primary-800 border rounded-lg px-4 py-3 text-sm ${
              errors.cpf_cnpj ? "border-red-500" : "border-primary-700"
            }`}
          />

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={country.code}
                onChange={handleCountryChange}
                className="appearance-none bg-primary-800 border border-primary-700 text-gray-100 rounded-lg h-[48px] pl-4 pr-10 text-sm cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs">
                ▼
              </span>
            </div>

            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="Telefone"
              className={`flex-1 bg-primary-800 border rounded-lg px-4 py-3 text-sm ${
                errors.telefone ? "border-red-500" : "border-primary-700"
              }`}
            />
          </div>

          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            className={`bg-primary-800 border rounded-lg px-4 py-3 text-sm ${
              errors.email ? "border-red-500" : "border-primary-700"
            }`}
          />

          <button
            onClick={submit}
            disabled={loading}
            className="bg-primary-500 text-primary-900 font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Concluir"}
          </button>
        </div>
      </div>
    </div>
  );
}