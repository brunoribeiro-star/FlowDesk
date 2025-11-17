"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
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

  const [country, setCountry] = useState(COUNTRIES[0]);

  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    observacoes: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    telefone: "",
  });

  function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.toLowerCase());
  }

  function maskPhoneBR(value: string): string {
    let digits = value.replace(/\D/g, "");

    digits = digits.slice(0, 11);

    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = COUNTRIES.find((c) => c.code === e.target.value);
    if (selected) {
      setCountry(selected);
      setForm((prev) => ({
        ...prev,
        telefone: `${selected.dial} `,
      }));
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === "email") {
      if (value.length > 0 && !validateEmail(value)) {
        setErrors((prev) => ({ ...prev, email: "E-mail inválido" }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
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

      setForm({ ...form, telefone: value });
      return;
    }

    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.nome.trim()) return alert("O nome do cliente é obrigatório.");
    if (errors.email) return alert("Corrija o e-mail antes de salvar.");
    if (errors.telefone) return alert("Corrija o telefone antes de salvar.");

    setLoading(true);

    try {
      await addCliente(form);
      alert("Cliente criado com sucesso!");
      router.push("/dashboard/clientes");
    } catch (err: any) {
      alert("Erro ao criar cliente: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
        <header className="w-full flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[32px] text-gray-200 font-semibold">Novo Cliente</h1>
            <p className="text-[18px] text-gray-300">
              Adicione um novo cliente ao seu portfólio.
            </p>
          </div>
        </header>

        <section className="flex-1 bg-primary-800 border border-primary-700 rounded-lg p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl mx-auto">

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
                <span className="text-red-400 text-[14px] mt-1">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">Telefone</label>

              <div className="flex items-center gap-3">
                <div className="relative">
                    <select
                        value={country.code}
                        onChange={handleCountryChange}
                        className="appearance-none bg-primary-900 border border-primary-700 text-gray-100 rounded-lg h-[58px] pl-4 pr-10 text-[16px] cursor-pointer py-4"
                        style={{
                            width: "auto",
                            height: "auto",
                        }}
                    >
                        {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                        {c.flag} {c.dial}
                        </option>
                        ))}
                    </select>

                    <span className="ponter-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">▼</span>
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
                <span className="text-red-400 text-[14px]">
                  {errors.telefone}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[18px] text-gray-200">Observações</label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                rows={4}
                className="rounded-lg bg-primary-900 border border-primary-700 px-5 py-3 text-gray-100 resize-none"
              />
            </div>

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